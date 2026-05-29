import { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import { prisma } from '@albion-tool/database'
import { getTopProfitHighlight } from '@albion-tool/market-engine'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// ── ALBION API CONFIG ─────────────────────────────────────────
const REGION_APIS: Record<string, string> = {
  WEST: 'https://gameinfo.albiononline.com/api/gameinfo',
  EAST: 'https://gameinfo-sgp.albiononline.com/api/gameinfo',
  EUROPE: 'https://gameinfo-ams.albiononline.com/api/gameinfo',
}

const REGION_NAMES: Record<string, string> = {
  WEST: 'Americas (West)',
  EAST: 'Asia (East)',
  EUROPE: 'Europe',
}

// Keep track of recently posted event IDs per guild to avoid duplicates
const processedEventsCache = new Map<string, Set<number>>()

// Keep track of last sent daily event texts to avoid duplicates
const lastSentEventTextCache = new Map<string, string>()

// ── INITIALIZATION ────────────────────────────────────────────
const token = process.env.DISCORD_BOT_TOKEN
const clientId = process.env.DISCORD_CLIENT_ID

if (!token || !clientId) {
  console.warn('⚠️ DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID is missing. Discord Bot will not start.')
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
})

// ── REGISTER SLASH COMMANDS ───────────────────────────────────
async function registerSlashCommands() {
  if (!token || !clientId) return

  const commands = [
    new SlashCommandBuilder()
      .setName('item')
      .setDescription('Rechercher un item d\'Albion Online et afficher ses prix')
      .addStringOption(option =>
        option.setName('nom')
          .setDescription('Nom ou identifiant de l\'item')
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName('crafting-tree')
      .setDescription('Afficher l\'arbre de crafting et la structure de coût d\'un item')
      .addStringOption(option =>
        option.setName('nom')
          .setDescription('Nom ou identifiant de l\'item')
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName('status')
      .setDescription('Afficher le statut actuel des serveurs Albion Online'),
  ].map(command => command.toJSON())

  const rest = new REST({ version: '10' }).setToken(token)

  try {
    console.log('[Discord Bot] Registering global slash commands...')
    await rest.put(Routes.applicationCommands(clientId), { body: commands })
    console.log('[Discord Bot] Slash commands registered successfully!')
  } catch (error) {
    console.error('[Discord Bot] Error registering slash commands:', error)
  }
}

// ── SLASH COMMAND HANDLERS ────────────────────────────────────
client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction

    try {
      if (commandName === 'item') {
        await handleItemCommand(interaction)
      } else if (commandName === 'crafting-tree') {
        await handleCraftingTreeCommand(interaction)
      } else if (commandName === 'status') {
        await handleStatusCommand(interaction)
      }
    } catch (error) {
      console.error(`[Discord Bot] Error handling command /${commandName}:`, error)
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: 'Une erreur est survenue lors de l\'exécution de cette commande.', ephemeral: true })
      } else {
        await interaction.reply({ content: 'Une erreur est survenue lors de l\'exécution de cette commande.', ephemeral: true })
      }
    }
  } else if (interaction.isButton()) {
    const { customId } = interaction
    try {
      if (customId.startsWith('craft_tree:')) {
        const itemId = customId.split(':')[1]
        await handleButtonCraftTree(interaction, itemId)
      }
    } catch (error) {
      console.error(`[Discord Bot] Error handling button ${customId}:`, error)
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: 'Une erreur est survenue lors du chargement du crafting tree.', ephemeral: true })
      } else {
        await interaction.reply({ content: 'Une erreur est survenue lors du chargement du crafting tree.', ephemeral: true })
      }
    }
  }
})

// 1. /item <nom>
async function handleItemCommand(interaction: any) {
  await interaction.deferReply()
  const queryText = interaction.options.getString('nom')

  // Search item in DB
  const items = await prisma.item.findMany({
    where: {
      OR: [
        { uniqueName: { contains: queryText, mode: 'insensitive' } },
        {
          localizations: {
            some: {
              locale: 'FR-FR',
              name: { contains: queryText, mode: 'insensitive' },
            },
          },
        },
      ],
    },
    include: {
      localizations: { where: { locale: 'FR-FR' }, take: 1 },
      resolvedPrices: { include: { location: true } },
    },
    take: 5,
  })

  if (items.length === 0) {
    await interaction.editReply(`❌ Aucun item trouvé pour "${queryText}".`)
    return
  }

  const item = items[0]
  const name = item.localizations[0]?.name ?? item.uniqueName
  const tier = item.tier
  const ench = item.enchantmentLevel
  
  const embed = new EmbedBuilder()
    .setTitle(`⚔️ ${name}`)
    .setDescription(`**ID Unique:** \`${item.uniqueName}\`\n**Tier:** T${tier}.${ench}\n**Type:** ${item.itemType}`)
    .setColor(0xc9a14a) // Gold
    .setThumbnail(`https://render.albiononline.com/v1/item/${item.uniqueName}.png`)
    .setFooter({ text: 'Albion SilverMind Bot' })
    .setTimestamp()

  if (item.resolvedPrices && item.resolvedPrices.length > 0) {
    const priceFields = item.resolvedPrices.map((p: any) => {
      const minBuy = p.minBuyPrice ? `${Math.round(p.minBuyPrice).toLocaleString()} silver` : 'N/A'
      const avgPrice = p.avgPrice ? `${Math.round(p.avgPrice).toLocaleString()} silver` : 'N/A'
      return {
        name: `📍 ${p.location.name}`,
        value: `• **Prix Min Achat:** ${minBuy}\n• **Prix Moyen:** ${avgPrice}\n• **Actualisé:** <t:${Math.round(new Date(p.updatedAt).getTime() / 1000)}:R>`,
        inline: true,
      }
    })
    embed.addFields(priceFields.slice(0, 9))
  } else {
    embed.addFields({ name: 'Marché', value: 'Aucune donnée de prix disponible pour le moment.' })
  }

  // ── BUTTONS ASSEMBLY ──
  const buttons: ButtonBuilder[] = []

  // 1. Redirection Button pointing to System Settings Website URL
  const publicUrlConfig = await prisma.systemConfig.findUnique({
    where: { key: 'public_app_url' }
  })
  const publicUrl = publicUrlConfig?.value as string | undefined

  if (publicUrl) {
    buttons.push(
      new ButtonBuilder()
        .setLabel('Voir sur le Site')
        .setURL(`${publicUrl}/items/${item.uniqueName}`)
        .setStyle(ButtonStyle.Link)
    )
  }

  // 2. Crafting Tree Interactive Action Button
  if (item.isCraftable) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`craft_tree:${item.id}`)
        .setLabel('Afficher le Crafting Tree')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🌳')
    )
  }

  const replyOptions: any = { embeds: [embed] }

  if (buttons.length > 0) {
    replyOptions.components = [new ActionRowBuilder().addComponents(buttons)]
  }

  await interaction.editReply(replyOptions)
}

// 2. /crafting-tree <nom>
// 2. /crafting-tree <nom>
interface CraftNode {
  uniqueName: string
  name: string
  tier: number
  qty: number
  children: CraftNode[]
  x?: number
  y?: number
}

// Caching and visual utilities for crafting tree
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const IMAGE_CACHE_DIR = path.join(__dirname, 'cache')
if (!fs.existsSync(IMAGE_CACHE_DIR)) {
  fs.mkdirSync(IMAGE_CACHE_DIR, { recursive: true })
}

async function getItemImageBase64(uniqueName: string): Promise<string> {
  const cachePath = path.join(IMAGE_CACHE_DIR, `${uniqueName}.png`)
  
  if (fs.existsSync(cachePath)) {
    try {
      const buffer = fs.readFileSync(cachePath)
      return `data:image/png;base64,${buffer.toString('base64')}`
    } catch (e) {
      console.error(`Error reading cached image for ${uniqueName}:`, e)
    }
  }

  try {
    const response = await fetch(`https://render.albiononline.com/v1/item/${uniqueName}.png`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      fs.writeFileSync(cachePath, buffer)
      return `data:image/png;base64,${buffer.toString('base64')}`
    }
  } catch (error) {
    console.error(`Error fetching item image for ${uniqueName}:`, error)
  }

  // Fallback 1x1 transparent png
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
}

function getTierColor(tier: number): string {
  switch (tier) {
    case 1: return '#cbd5e1' // Gray
    case 2: return '#94a3b8' // Slate
    case 3: return '#16a34a' // Green
    case 4: return '#2563eb' // Blue
    case 5: return '#dc2626' // Red
    case 6: return '#ea580c' // Orange
    case 7: return '#eab308' // Yellow
    case 8: return '#0891b2' // Cyan
    default: return '#c9a14a' // Gold
  }
}

function wrapText(text: string, maxLength: number = 18): string[] {
  if (text.length <= maxLength) return [text]
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''
  
  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxLength) {
      currentLine = (currentLine + ' ' + word).trim()
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    }
  }
  if (currentLine) lines.push(currentLine)
  
  if (lines.length > 2) {
    lines[1] = lines[1].substring(0, maxLength - 3) + '...'
    return [lines[0], lines[1]]
  }
  return lines
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '&': return '&amp;'
      case '\'': return '&apos;'
      case '"': return '&quot;'
      default: return c
    }
  })
}

function collectUniqueNames(node: CraftNode, names: Set<string> = new Set()): Set<string> {
  names.add(node.uniqueName)
  for (const child of node.children) {
    collectUniqueNames(child, names)
  }
  return names
}

function aggregateIngredients(
  node: CraftNode,
  list: Map<string, { name: string; qty: number; tier: number }> = new Map()
): Map<string, { name: string; qty: number; tier: number }> {
  if (node.children.length === 0) {
    const existing = list.get(node.uniqueName)
    if (existing) {
      existing.qty += node.qty
    } else {
      list.set(node.uniqueName, { name: node.name, qty: node.qty, tier: node.tier })
    }
  } else {
    for (const child of node.children) {
      aggregateIngredients(child, list)
    }
  }
  return list
}

async function getCraftTree(itemId: string, qty: number, depth: number = 0, visited: Set<string> = new Set()): Promise<CraftNode | null> {
  if (depth > 6 || visited.has(itemId)) return null
  
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: {
      localizations: { where: { locale: 'FR-FR' }, take: 1 },
      craftingRecipe: {
        include: {
          ingredients: true
        }
      }
    }
  })

  if (!item) return null

  const node: CraftNode = {
    uniqueName: item.uniqueName,
    name: item.localizations[0]?.name ?? item.uniqueName,
    tier: item.tier,
    qty,
    children: []
  }

  const nextVisited = new Set(visited)
  nextVisited.add(itemId)

  if (item.craftingRecipe && item.craftingRecipe.ingredients.length > 0) {
    for (const ing of item.craftingRecipe.ingredients) {
      const child = await getCraftTree(ing.itemId, ing.quantity * qty, depth + 1, nextVisited)
      if (child) {
        node.children.push(child)
      }
    }
  }

  return node
}

async function renderAndSendCraftTree(interaction: any, rootItem: any, craftTree: any) {
  const rootName = rootItem.localizations[0]?.name ?? rootItem.uniqueName

  // Pre-fetch all images concurrently and cache them!
  const uniqueNames = collectUniqueNames(craftTree)
  const imageMap = new Map<string, string>()

  try {
    await Promise.all(
      Array.from(uniqueNames).map(async (name) => {
        const base64 = await getItemImageBase64(name)
        imageMap.set(name, base64)
      })
    )
  } catch (err) {
    console.error('Error fetching/processing crafting tree item images:', err)
  }

  // Calculate coordinates for dynamic SVG layout
  let currentY = 30
  let maxDepth = 0

  const layoutTree = (node: CraftNode, depth: number = 0) => {
    if (depth > maxDepth) maxDepth = depth
    node.x = 40 + depth * 260 // wider horizontal step

    if (node.children.length === 0) {
      node.y = currentY
      currentY += 90 // slightly more vertical space between leaves
    } else {
      for (const child of node.children) {
        layoutTree(child, depth + 1)
      }
      const firstY = node.children[0].y || 0
      const lastY = node.children[node.children.length - 1].y || 0
      node.y = (firstY + lastY) / 2
    }
  }

  layoutTree(craftTree, 0)

  // Generate a beautiful, high-end SVG tree diagram
  let elements: string[] = []

  const drawNodeAndLines = (n: CraftNode) => {
    const nx = n.x || 0
    const ny = n.y || 0
    
    for (const child of n.children) {
      const cx = child.x || 0
      const cy = child.y || 0
      const parentRightX = nx + 200 // matching card width 200
      const parentRightY = ny + 35 // matching card height 70 (vertical center)
      const childLeftX = cx
      const childLeftY = cy + 35 // matching card height 70 (vertical center)
      const controlX1 = parentRightX + 40
      const controlX2 = childLeftX - 40
      
      elements.push(`
        <path d="M ${parentRightX} ${parentRightY} C ${controlX1} ${parentRightY}, ${controlX2} ${childLeftY}, ${childLeftX} ${childLeftY}" 
              stroke="#c9a14a" stroke-width="2.5" fill="none" opacity="0.4" />
      `)
      
      drawNodeAndLines(child)
    }

    const isRoot = n.x === 40
    const strokeColor = isRoot ? '#c9a14a' : '#3f3f56'
    const shadowGlow = isRoot ? 'filter="url(#glow)"' : ''
    const tierColor = getTierColor(n.tier)
    const base64Image = imageMap.get(n.uniqueName) || ''

    elements.push(`
      <g ${shadowGlow}>
        <!-- Card background with rounded corners and linear gradient -->
        <rect x="${nx}" y="${ny}" width="200" height="70" rx="10" fill="url(#card-grad)" stroke="${strokeColor}" stroke-width="2" />
        
        <!-- Official Item Icon (loaded as base64 so Sharp/librsvg renders it perfectly) -->
        <image href="${base64Image}" x="${nx + 10}" y="${ny + 10}" width="50" height="50" />
        
        <!-- Tier Badge -->
        <rect x="${nx + 70}" y="${ny + 10}" width="28" height="16" rx="4" fill="${tierColor}" opacity="0.2" />
        <text x="${nx + 84}" y="${ny + 22}" class="node-text node-tier" fill="${tierColor}" text-anchor="middle">T${n.tier}</text>
        
        <!-- Quantity Badge -->
        <text x="${nx + 190}" y="${ny + 23}" class="node-text node-qty">x${n.qty}</text>
        
        <!-- Item Name (wrapped and clean) -->
    `)

    const nameLines = wrapText(n.name, 18)
    if (nameLines.length === 1) {
      elements.push(`
        <text x="${nx + 70}" y="${ny + 48}" class="node-text node-title">${escapeXml(nameLines[0])}</text>
      `)
    } else {
      elements.push(`
        <text x="${nx + 70}" y="${ny + 42}" class="node-text node-title">${escapeXml(nameLines[0])}</text>
        <text x="${nx + 70}" y="${ny + 55}" class="node-text node-title">${escapeXml(nameLines[1])}</text>
      `)
    }

    elements.push(`
      </g>
    `)
  }

  drawNodeAndLines(craftTree)

  const width = (maxDepth + 1) * 260 + 80
  const height = currentY + 30

  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background-color: #0b0b14;">
      <defs>
        <!-- Filter for glowing root card -->
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <!-- Linear gradient for cards background -->
        <linearGradient id="card-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1b1b2f" />
          <stop offset="100%" stop-color="#11111d" />
        </linearGradient>
      </defs>
      <style>
        .node-text {
          font-family: 'DejaVu Sans', Arial, Helvetica, sans-serif;
        }
        .node-title {
          font-size: 11px;
          font-weight: bold;
          fill: #ffffff;
        }
        .node-tier {
          font-size: 10px;
          font-weight: bold;
        }
        .node-qty {
          font-size: 12px;
          font-weight: 900;
          fill: #c9a14a;
          text-anchor: end;
        }
      </style>
      ${elements.join('\n')}
    </svg>
  `

  // Render SVG to premium high-fidelity PNG buffer via sharp
  const pngBuffer = await sharp(Buffer.from(svgString)).png().toBuffer()
  const fileAttachment = new AttachmentBuilder(pngBuffer, { name: 'crafting-tree.png' })

  // Generate the shopping list (liste de course) of raw materials
  const ingredientsMap = aggregateIngredients(craftTree)
  const shoppingListLines = Array.from(ingredientsMap.values())
    .sort((a, b) => b.tier - a.tier || a.name.localeCompare(b.name))
    .map(ing => `• **x${ing.qty}** ${ing.name} *(T${ing.tier})*`)

  const shoppingListText = shoppingListLines.join('\n') || 'Aucun ingrédient requis.'

  const embed = new EmbedBuilder()
    .setTitle(`🌳 Arbre d'Artisanat : ${rootName}`)
    .setDescription(`Structure d'ingrédients officielle générée visuellement par Albion SilverMind.`)
    .setColor(0x22c55e) // Green
    .addFields({
      name: '📋 Liste de course (Ingrédients requis)',
      value: shoppingListText.length > 1024 ? shoppingListText.substring(0, 1020) + '...' : shoppingListText
    })
    .setImage('attachment://crafting-tree.png')
    .setFooter({ text: 'Albion SilverMind Bot' })
    .setTimestamp()

  await interaction.editReply({ embeds: [embed], files: [fileAttachment] })
}

// 2. /crafting-tree <nom>
async function handleCraftingTreeCommand(interaction: any) {
  await interaction.deferReply()
  const queryText = interaction.options.getString('nom')

  const items = await prisma.item.findMany({
    where: {
      OR: [
        { uniqueName: { contains: queryText, mode: 'insensitive' } },
        {
          localizations: {
            some: {
              locale: 'FR-FR',
              name: { contains: queryText, mode: 'insensitive' },
            },
          },
        },
      ],
      isCraftable: true,
    },
    include: {
      localizations: { where: { locale: 'FR-FR' }, take: 1 },
    },
    take: 1,
  })

  if (items.length === 0) {
    await interaction.editReply(`❌ Aucun item craftable trouvé pour "${queryText}".`)
    return
  }

  const rootItem = items[0]
  const rootName = rootItem.localizations[0]?.name ?? rootItem.uniqueName

  // Fetch complete recursive crafting tree from database
  const craftTree = await getCraftTree(rootItem.id, 1)

  if (!craftTree) {
    await interaction.editReply(`❌ Impossible de générer la recette pour "${rootName}".`)
    return
  }

  await renderAndSendCraftTree(interaction, rootItem, craftTree)
}

// Handler for the "Afficher le Crafting Tree" interactive button click
async function handleButtonCraftTree(interaction: any, itemId: string) {
  await interaction.deferReply()

  try {
    const rootItem = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        localizations: { where: { locale: 'FR-FR' }, take: 1 }
      }
    })

    if (!rootItem) {
      await interaction.editReply(`❌ Impossible de trouver cet item.`)
      return
    }

    const rootName = rootItem.localizations[0]?.name ?? rootItem.uniqueName
    const craftTree = await getCraftTree(rootItem.id, 1)

    if (!craftTree) {
      await interaction.editReply(`❌ Impossible de générer la recette pour "${rootName}".`)
      return
    }

    await renderAndSendCraftTree(interaction, rootItem, craftTree)
  } catch (error) {
    console.error(`[Discord Bot] Error handling craft tree button:`, error)
    await interaction.editReply(`❌ Une erreur est survenue lors du chargement du crafting tree.`)
  }
}

// Helper to fetch statuses from regional APIs resiliently
async function fetchRegionalServerStatus() {
  const fetchStatus = async (url: string): Promise<string> => {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(3000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      })
      if (!res.ok) return 'online'
      const data = await res.json() as any
      return data.status || 'online'
    } catch {
      return 'online'
    }
  }

  const [west, east, europe] = await Promise.all([
    fetchStatus('https://serverstatus.albiononline.com/api/v1/status'),
    fetchStatus('http://serverstatus-sgp.albiononline.com/api/v1/status'),
    fetchStatus('http://serverstatus-ams.albiononline.com/api/v1/status')
  ])

  return { west, east, europe }
}

async function getStatusBackgroundImage(): Promise<Buffer> {
  const cachePath = path.join(IMAGE_CACHE_DIR, 'status_bg.jpeg')
  
  if (fs.existsSync(cachePath)) {
    try {
      return fs.readFileSync(cachePath)
    } catch (e) {
      console.error('Error reading cached status background:', e)
    }
  }

  try {
    const response = await fetch('https://assets.albiononline.com/uploads/media/default/media/2ffb4a767e9202ed93572dde213d46410f84755e.jpeg')
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      fs.writeFileSync(cachePath, buffer)
      return buffer
    }
  } catch (error) {
    console.error('Error fetching status background image:', error)
  }

  return Buffer.alloc(0)
}

// 3. /status
async function generateServerStatusImageAndEmbed(regionSetting: string = 'ALL'): Promise<{ file: AttachmentBuilder; embed: EmbedBuilder }> {
  const { west, east, europe } = await fetchRegionalServerStatus()

  // Fetch global embed image URL from system settings
  const globalImageConfig = await prisma.systemConfig.findUnique({
    where: { key: 'discord_embed_image_url' }
  })
  const globalImageUrl = globalImageConfig?.value as string | undefined

  // 1. Get status image background
  const bgBuffer = await getStatusBackgroundImage()
  
  // 2. Prepare status visual helpers
  const getStatusDetails = (status: string) => {
    let color = '#94a3b8'
    let glow = ''

    if (status === 'online') {
      color = '#10b981'
      glow = 'filter="url(#glow-online)"'
    } else if (status === 'offline') {
      color = '#ef4444'
      glow = 'filter="url(#glow-offline)"'
    } else if (status === 'maintenance') {
      color = '#f59e0b'
      glow = 'filter="url(#glow-offline)"'
    }

    return { color, glow }
  }

  const westDetails = getStatusDetails(west)
  const eastDetails = getStatusDetails(east)
  const europeDetails = getStatusDetails(europe)
  const updatedAtStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  // Build the list of active server blocks based on regionSetting
  const serverBlocks: string[] = []

  if (regionSetting === 'ALL') {
    serverBlocks.push(`
      <g transform="translate(0, 110)">
        <circle cx="65" cy="30" r="8" fill="${westDetails.color}" ${westDetails.glow} />
        <text x="90" y="24" class="font-sans server-name">Americas (West)</text>
        <text x="90" y="44" class="font-sans server-region">Washington • États-Unis</text>
      </g>
    `)
    serverBlocks.push(`
      <g transform="translate(0, 200)">
        <circle cx="65" cy="30" r="8" fill="${eastDetails.color}" ${eastDetails.glow} />
        <text x="90" y="24" class="font-sans server-name">Asia (East)</text>
        <text x="90" y="44" class="font-sans server-region">Singapour • Asie-Pacifique</text>
      </g>
    `)
    serverBlocks.push(`
      <g transform="translate(0, 290)">
        <circle cx="65" cy="30" r="8" fill="${europeDetails.color}" ${europeDetails.glow} />
        <text x="90" y="24" class="font-sans server-name">Europe</text>
        <text x="90" y="44" class="font-sans server-region">Amsterdam • Europe</text>
      </g>
    `)
  } else if (regionSetting === 'WEST') {
    serverBlocks.push(`
      <g transform="translate(0, 200)">
        <circle cx="65" cy="30" r="8" fill="${westDetails.color}" ${westDetails.glow} />
        <text x="90" y="24" class="font-sans server-name">Americas (West)</text>
        <text x="90" y="44" class="font-sans server-region">Washington • États-Unis</text>
      </g>
    `)
  } else if (regionSetting === 'EAST') {
    serverBlocks.push(`
      <g transform="translate(0, 200)">
        <circle cx="65" cy="30" r="8" fill="${eastDetails.color}" ${eastDetails.glow} />
        <text x="90" y="24" class="font-sans server-name">Asia (East)</text>
        <text x="90" y="44" class="font-sans server-region">Singapour • Asie-Pacifique</text>
      </g>
    `)
  } else if (regionSetting === 'EUROPE') {
    serverBlocks.push(`
      <g transform="translate(0, 200)">
        <circle cx="65" cy="30" r="8" fill="${europeDetails.color}" ${europeDetails.glow} />
        <text x="90" y="24" class="font-sans server-name">Europe</text>
        <text x="90" y="44" class="font-sans server-region">Amsterdam • Europe</text>
      </g>
    `)
  }

  // 3. SVG overlay with left side black gradient and server status details
  const svgOverlay = `
    <svg width="800" height="450" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="black-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#09090e" stop-opacity="1" />
          <stop offset="42%" stop-color="#09090e" stop-opacity="0.95" />
          <stop offset="70%" stop-color="#09090e" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#09090e" stop-opacity="0" />
        </linearGradient>
        <filter id="glow-online" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="glow-offline" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      <style>
        .font-sans {
          font-family: 'DejaVu Sans', Arial, Helvetica, sans-serif;
        }
        .title {
          font-size: 24px;
          font-weight: 900;
          fill: #c9a14a;
          letter-spacing: 2px;
        }
        .subtitle {
          font-size: 11px;
          fill: #94a3b8;
          letter-spacing: 1px;
        }
        .server-name {
          font-size: 18px;
          font-weight: bold;
          fill: #ffffff;
        }
        .server-region {
          font-size: 12px;
          fill: #a1a1aa;
        }
      </style>

      <!-- Gradient Background Cover -->
      <rect x="0" y="0" width="800" height="450" fill="url(#black-grad)" />

      <!-- Brand Headers -->
      <text x="50" y="55" class="font-sans title">ALBION ONLINE</text>
      <text x="50" y="75" class="font-sans subtitle">STATUT TEMPS RÉEL DES SERVEURS</text>
      
      <!-- Horizontal divider line -->
      <line x1="50" y1="90" x2="350" y2="90" stroke="#c9a14a" stroke-width="2" opacity="0.6" />
      
      ${serverBlocks.join('\n')}

      <!-- Footer Info -->
      <text x="50" y="410" class="font-sans subtitle" opacity="0.5">ACTUALISÉ À ${updatedAtStr} • ALBION SILVERMIND</text>
    </svg>
  `

  // 4. Generate the composite image using sharp
  let sharpImg: sharp.Sharp
  if (bgBuffer.length > 0) {
    sharpImg = sharp(bgBuffer).resize(800, 450, { fit: 'cover', position: 'center' })
  } else {
    sharpImg = sharp({
      create: {
        width: 800,
        height: 450,
        channels: 4,
        background: { r: 11, g: 11, b: 20, alpha: 1 }
      }
    })
  }

  const pngBuffer = await sharpImg
    .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
    .png()
    .toBuffer()

  const file = new AttachmentBuilder(pngBuffer, { name: 'server-status.png' })

  const embed = new EmbedBuilder()
    .setTitle('🌐 Albion Online - Statut des Serveurs')
    .setDescription('Voici l\'état opérationnel des serveurs officiels d\'Albion Online mis à jour en temps réel.')
    .setColor(0x3b82f6) // Blue
    .setImage('attachment://server-status.png')
    .setTimestamp()

  if (globalImageUrl) {
    embed.setFooter({ text: 'Albion SilverMind Bot', iconURL: globalImageUrl })
    embed.setThumbnail(globalImageUrl)
  } else {
    embed.setFooter({ text: 'Albion SilverMind Bot' })
  }

  return { file, embed }
}

// 3. /status
async function handleStatusCommand(interaction: any) {
  await interaction.deferReply()

  try {
    let regionSetting = 'ALL'
    if (interaction.guildId) {
      const config = await prisma.discordGuildConfig.findUnique({
        where: { id: interaction.guildId }
      })
      if (config) {
        regionSetting = config.serverStatusRegion
      }
    }

    const { file, embed } = await generateServerStatusImageAndEmbed(regionSetting)
    await interaction.editReply({ embeds: [embed], files: [file] })
  } catch (error) {
    console.error('[Discord Bot] Error fetching server status:', error)
    await interaction.editReply('❌ Impossible de récupérer les statuts de serveurs pour le moment. Veuillez réessayer plus tard.')
  }
}

// ── BACKGROUND TASKS & POLLING ────────────────────────────────
async function startBackgroundLoops() {
  console.log('[Discord Bot] Starting background polling tasks (60s loop)...')
  
  setInterval(async () => {
    try {
      const configs = await prisma.discordGuildConfig.findMany()

      for (const config of configs) {
        // 1. Killboard updates
        if (config.killboardEnabled && config.killboardChannelId && config.guildId) {
          await runKillboardSync(config)
        }

        // 2. Automated Guild Stats dashboard
        if (config.statsEnabled && config.statsChannelId && config.guildId) {
          await runStatsDashboardSync(config)
        }

        // 3. Live Server Status updates
        if (config.serverStatusEnabled && config.serverStatusChannelId) {
          await runServerStatusSync(config)
        }

        // 4. Profit Alerts
        if (config.profitAlertsEnabled && config.profitAlertsChannelId) {
          await runProfitAlertsSync(config)
        }

        // 5. Daily Event Announcements
        if (config.dailyEventEnabled && config.dailyEventChannelId) {
          await runDailyEventSync(config)
        }
      }
    } catch (err) {
      console.error('[Discord Bot] Error in background polling cycle:', err)
    }
  }, 60000) // Poll every 60 seconds
}

// Helper: Run Killboard Sync
async function runKillboardSync(config: any) {
  try {
    const apiBase = REGION_APIS[config.serverConnection] ?? REGION_APIS.WEST
    const url = `${apiBase}/events?limit=15&guildId=${config.guildId}`

    const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return

    const events = await res.json() as any[]
    if (!Array.isArray(events)) return

    // Ensure cache exists for this guild
    if (!processedEventsCache.has(config.id)) {
      processedEventsCache.set(config.id, new Set())
      // Fill cache with first items on startup to avoid spamming historical kills
      events.forEach(e => processedEventsCache.get(config.id)!.add(e.EventId))
      return
    }

    const cache = processedEventsCache.get(config.id)!
    const channel = await client.channels.fetch(config.killboardChannelId).catch(() => null) as any
    if (!channel) return

    // Sort chronologically (oldest first)
    const sortedEvents = events.reverse()

    for (const event of sortedEvents) {
      if (cache.has(event.EventId)) continue
      cache.add(event.EventId)
      
      // Limit cache size
      if (cache.size > 200) {
        const firstValue = cache.values().next().value
        if (firstValue !== undefined) cache.delete(firstValue)
      }

      const isKill = event.Killer?.GuildId === config.guildId
      const isDeath = event.Victim?.GuildId === config.guildId

      if (!isKill && !isDeath) continue

      const killerName = event.Killer?.Name ?? 'Inconnu'
      const victimName = event.Victim?.Name ?? 'Inconnu'
      const fame = event.TotalVictimKillFame ?? 0
      const ipKiller = Math.round(event.Killer?.AverageItemPower ?? 0)
      const ipVictim = Math.round(event.Victim?.AverageItemPower ?? 0)

      const embed = new EmbedBuilder()
        .setTitle(isKill ? `⚔️ Victoire de K.O. : ${killerName}` : `💀 Trépas de Allié : ${victimName}`)
        .setDescription(
          `**Tueur:** ${killerName} [${event.Killer?.GuildName || 'Sans Guilde'}] (IP: ${ipKiller})\n` +
          `**Victime:** ${victimName} [${event.Victim?.GuildName || 'Sans Guilde'}] (IP: ${ipVictim})\n` +
          `**Fame de Combat:** ${fame.toLocaleString()} 💎`
        )
        .setColor(isKill ? 0x22c55e : 0xef4444) // Green for kill, Red for death
        .setThumbnail(`https://render.albiononline.com/v1/item/${event.Killer?.Equipment?.MainHand?.Type || 'T1_WOOD'}.png`)
        .setFooter({ text: `Albion SilverMind • Event ID: ${event.EventId}` })
        .setTimestamp(new Date(event.TimeStamp))

      await channel.send({ embeds: [embed] }).catch(() => null)
    }
  } catch (err) {
    console.error(`[Discord Bot] Error syncing killboard for guild ${config.name}:`, err)
  }
}

// Helper: Run Guild Stats Dashboard Sync
async function runStatsDashboardSync(config: any) {
  try {
    const apiBase = REGION_APIS[config.serverConnection] ?? REGION_APIS.WEST
    const url = `${apiBase}/guilds/${config.guildId}`

    const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return

    const guildData = await res.json()
    if (!guildData || !guildData.Name) return

    const killFame = guildData.killFame ?? 0
    const memberCount = guildData.MemberCount ?? 0

    const channel = await client.channels.fetch(config.statsChannelId).catch(() => null) as any
    if (!channel) return

    const embed = new EmbedBuilder()
      .setTitle(`🛡️ Tableau de Bord - ${guildData.Name}`)
      .setDescription(
        `Mise à jour en temps réel des statistiques globales de la guilde.\n\n` +
        `• **Membres Actifs:** \`${memberCount}\`\n` +
        `• **Fame PvP Totale:** \`${killFame.toLocaleString()}\` 💎\n` +
        `• **Alliance:** \`${guildData.AllianceName || 'Aucune'}\` [${guildData.AllianceTag || '-'}]\n` +
        `• **Serveur:** \`${REGION_NAMES[config.serverConnection] || config.serverConnection}\``
      )
      .setColor(0xc9a14a) // Gold
      .setFooter({ text: 'Actualisé automatiquement toutes les minutes' })
      .setTimestamp()

    if (config.statsMessageId) {
      const msg = await channel.messages.fetch(config.statsMessageId).catch(() => null)
      if (msg) {
        await msg.edit({ embeds: [embed] }).catch(() => null)
        return
      }
    }

    // Send new message and save its ID
    const newMsg = await channel.send({ embeds: [embed] }).catch(() => null)
    if (newMsg) {
      await prisma.discordGuildConfig.update({
        where: { id: config.id },
        data: { statsMessageId: newMsg.id },
      })
    }
  } catch (err) {
    console.error(`[Discord Bot] Error syncing stats for guild ${config.name}:`, err)
  }
}

// Helper: Run Server Status Sync
async function runServerStatusSync(config: any) {
  try {
    const channel = await client.channels.fetch(config.serverStatusChannelId).catch(() => null) as any
    if (!channel) return

    const { file, embed } = await generateServerStatusImageAndEmbed(config.serverStatusRegion)

    // For server status, let's keep a simple dashboard message structure
    const recentMsgs = await channel.messages.fetch({ limit: 10 }).catch(() => [])
    const botStatusMsg = Array.from(recentMsgs.values()).find((m: any) => m.author.id === client.user?.id && m.embeds[0]?.title?.includes('Statut des Serveurs')) as any

    if (botStatusMsg) {
      await botStatusMsg.edit({ embeds: [embed], files: [file] }).catch(() => null)
    } else {
      await channel.send({ embeds: [embed], files: [file] }).catch(() => null)
    }
  } catch (err) {
    console.error(`[Discord Bot] Error syncing server status:`, err)
  }
}

// Helper: Run Profit Alerts Sync
async function runProfitAlertsSync(config: any) {
  try {
    const highlight = await getTopProfitHighlight()
    if (!highlight) return

    if (highlight.margin < config.profitAlertsMinMargin) {
      return
    }

    const channel = await client.channels.fetch(config.profitAlertsChannelId).catch(() => null) as any
    if (!channel) return

    // Avoid spamming the exact same alert within short periods
    // We can check the last few messages in the channel
    const recentMsgs = await channel.messages.fetch({ limit: 5 }).catch(() => [])
    const alreadyAlerted = Array.from(recentMsgs.values()).some((m: any) => 
      m.embeds[0]?.title?.includes(highlight.name)
    )

    if (alreadyAlerted) return

    const embed = new EmbedBuilder()
      .setTitle(`💎 Alerte Profit de Craft : ${highlight.name}`)
      .setDescription(
        `Une opportunité de craft à marge exceptionnelle a été détectée !\n\n` +
        `• **Cité :** \`${highlight.city}\`\n` +
        `• **Marge de Profit :** \`${highlight.margin.toFixed(1)}%\` 🚀\n` +
        `• **Profit Estimé :** \`${Math.round(highlight.profit).toLocaleString()} silver\`\n` +
        `• **Coût de Production :** \`${Math.round(highlight.cost).toLocaleString()} silver\``
      )
      .setColor(0xf59e0b) // Amber/Gold
      .setThumbnail(highlight.iconUrl || `https://render.albiononline.com/v1/item/${highlight.uniqueName}.png`)
      .setFooter({ text: 'Albion SilverMind Profit Alerts' })
      .setTimestamp()

    await channel.send({ embeds: [embed] }).catch(() => null)
  } catch (err) {
    console.error(`[Discord Bot] Error in profit alerts sync:`, err)
  }
}

// Helper: Run Daily Event Sync
async function runDailyEventSync(config: any) {
  try {
    if (!config.dailyEventText || config.dailyEventText.trim() === '') return

    const cacheKey = config.id
    if (lastSentEventTextCache.get(cacheKey) === config.dailyEventText) {
      return // Already sent this exact text!
    }

    const channel = await client.channels.fetch(config.dailyEventChannelId).catch(() => null) as any
    if (!channel) return

    // Fetch global embed image URL from system settings for footer/logo
    const globalImageConfig = await prisma.systemConfig.findUnique({
      where: { key: 'discord_embed_image_url' }
    })
    const globalImageUrl = globalImageConfig?.value as string | undefined

    const embed = new EmbedBuilder()
      .setTitle('📢 Albion Online - Événement du Jour')
      .setDescription(config.dailyEventText)
      .setColor(0xf59e0b) // Gold/Amber
      .setTimestamp()

    if (globalImageUrl) {
      embed.setThumbnail(globalImageUrl)
      embed.setFooter({ text: 'Albion SilverMind Bot', iconURL: globalImageUrl })
    } else {
      embed.setFooter({ text: 'Albion SilverMind Bot' })
    }

    await channel.send({ embeds: [embed] })

    // Update cache to avoid duplicate announcements
    lastSentEventTextCache.set(cacheKey, config.dailyEventText)
  } catch (err) {
    console.error(`[Discord Bot] Error syncing daily event for guild ${config.name}:`, err)
  }
}

// ── BOT STARTUP ───────────────────────────────────────────────
async function start() {
  if (!token) return

  client.on('ready', async () => {
    console.log(`[Discord Bot] Logged in as ${client.user?.tag}!`)
    await registerSlashCommands()
    await startBackgroundLoops()
  })

  try {
    await client.login(token)
  } catch (err) {
    console.error('[Discord Bot] Client login failed:', err)
  }
}

start()
