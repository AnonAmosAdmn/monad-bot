import { Client, GatewayIntentBits, Events, PermissionFlagsBits } from "discord.js";
import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

// Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers // Needed to fetch members
  ]
});

// EVM provider
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const nftContractAddress = process.env.NFT_CONTRACT_ADDRESS;
const roleId = process.env.ROLE_ID;
// ERC721 ABI with balanceOf and ownerOf functions
const abi = [
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)"
];

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "verify") {
    // Ensure command is run in a guild
    if (!interaction.guild) {
      return interaction.reply({
        content: "❌ This command can only be used in a server.",
        flags: 64 // ephemeral
      });
    }

    const walletAddress = interaction.options.getString("address");

    if (!ethers.isAddress(walletAddress)) {
      return interaction.reply({
        content: "❌ Invalid wallet address.",
        flags: 64
      });
    }

    try {
      const contract = new ethers.Contract(nftContractAddress, abi, provider);
      
      // Check NFT balance
      const balance = await contract.balanceOf(walletAddress);

      if (balance > 0n) {
        const member = await interaction.guild.members.fetch(interaction.user.id);

        // Check if bot can manage the role
        const role = interaction.guild.roles.cache.get(roleId);
        if (!role) {
          return interaction.reply({
            content: "⚠️ Role not found. Please check ROLE_ID in .env",
            flags: 64
          });
        }

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
          return interaction.reply({
            content: "⚠️ I don't have permission to manage roles.",
            flags: 64
          });
        }

        await member.roles.add(roleId);
        await interaction.reply({
          content: "✅ Verification successful! Role granted.",
          flags: 64
        });
      } else {
        await interaction.reply({
          content: "❌ You don't own any NFTs from this collection.",
          flags: 64
        });
      }
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: "⚠️ Error verifying NFT ownership.",
        flags: 64
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
