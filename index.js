require("dotenv").config();

const express = require("express");
const app = express();

// ✅ Endpoint pour Render + UptimeRobot (keep-alive)
app.get("/", (req, res) => res.status(200).send("Bot is running ✅"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HTTP server listening on ${PORT}`));

const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require("discord.js");
const { translate } = require("@vitalets/google-translate-api");

const TOKEN = (process.env.DISCORD_TOKEN || "").trim();
const AR_EMOJI = process.env.AR_EMOJI || "🇸🇦";

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN is missing. Set it in Render Environment Variables.");
  process.exit(1);
}

// ✅ Client Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],

  // ✅ AUCUNE mention / AUCUN ping (users, roles, @everyone, @here) + pas de ping du replied user
  allowedMentions: {
    parse: [],
    repliedUser: false,
  },
});

// ✅ Logs utiles
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("warn", (m) => console.warn("⚠️ Discord warn:", m));
client.on("error", (e) => console.error("❌ Discord client error:", e));
client.on("shardError", (e) => console.error("❌ Discord shard error:", e));

// ✅ Traduction sur réaction
client.on("messageReactionAdd", async (reaction, user) => {
  try {
    if (user.bot) return;

    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();

    if (reaction.emoji.toString() !== AR_EMOJI) return;

    const msg = reaction.message;
    const text = msg.content?.trim();
    if (!text) return;

    // ✅ (Optionnel) ignore les messages du bot
    if (msg.author?.bot) return;

    if (text.length > 1500) {
      await msg.reply({
        content: "⚠️ Message too long to translate.",
        allowedMentions: { parse: [], repliedUser: false },
      });
      return;
    }

    let translated = "";
    try {
      const res = await translate(text, { to: "ar" });
      translated = res.text || "";

      // ✅ Anti-mention même visuellement (neutralise les @)
      translated = translated.replaceAll("@", "@\u200b");
    } catch (err) {
      console.error("❌ Translation error:", err);
      await msg.reply({
        content: "⚠️ Translation failed.",
        allowedMentions: { parse: [], repliedUser: false },
      });
      return;
    }

    if (!translated.trim()) return;

    const embed = new EmbedBuilder()
      .setColor("#2ecc71")
      .setTitle("🇸🇦 Arabic Translation")
      .setDescription(translated.length > 4000 ? translated.slice(0, 4000) : translated)
      .setFooter({ text: `Requested by ${user.tag}` });

    const sent = await msg.reply({
      embeds: [embed],
      allowedMentions: { parse: [], repliedUser: false },
    });

    // Supprime la réponse après 2 minutes
    setTimeout(() => {
      sent.delete().catch(() => {});
    }, 120000);
  } catch (err) {
    console.error("❌ Reaction handler error:", err);
  }
});

// ✅ Login robuste : affiche erreur + timeout si ça bloque
console.log("🔑 Attempting Discord login...");

const loginTimeout = setTimeout(() => {
  console.error("❌ Discord login timeout (30s). Check DISCORD_TOKEN / Render env / network / sleeping instance.");
  process.exit(1);
}, 30000);

client
  .login(TOKEN)
  .then(() => {
    clearTimeout(loginTimeout);
    console.log("✅ Discord login success");
  })
  .catch((err) => {
    clearTimeout(loginTimeout);
    console.error("❌ Discord login failed:", err);
    process.exit(1);
  });