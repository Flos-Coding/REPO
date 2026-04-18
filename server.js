const fs = require("fs");
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(express.json());

// ========================
// KONFIG
// ========================
const PORT = process.env.PORT || 3000;

const MAIL_USER = "flo.koller74@gmail.com";
const MAIL_PASS = "G1!jacifloL";

// ========================
// MAIL SETUP
// ========================
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: MAIL_USER,
        pass: MAIL_PASS
    }
});

// ========================
// LIZENZEN LADEN
// ========================
let licenses = [];

function loadLicenses() {
    try {
        licenses = JSON.parse(fs.readFileSync("licenses.json"));
    } catch (e) {
        licenses = [];
    }
}

function saveLicenses() {
    fs.writeFileSync("licenses.json", JSON.stringify(licenses, null, 2));
}

loadLicenses();

// ========================
// ROOT
// ========================
app.get("/", (req, res) => {
    res.send("License Server läuft 🚀");
});

// ========================
// 🔑 KEY GENERATOR
// ========================
function generateKey() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    function block(len) {
        let s = "";
        for (let i = 0; i < len; i++) {
            s += chars[Math.floor(Math.random() * chars.length)];
        }
        return s;
    }

    return "FLO-" + block(5) + "-" + block(5) + "-" + block(5);
}

// ========================
// 📧 LIZENZ ERSTELLEN
// ========================
app.post("/api/license/create", async (req, res) => {

    const { name, email, expires, device_limit } = req.body;

    if (!name || !email || !expires) {
        return res.status(400).json({ error: "Missing fields" });
    }

    const key = generateKey();

    const lic = {
        key,
        name,
        email,
        expires,
        device_limit: device_limit || 1,
        activated: false,
        devices: []
    };

    licenses.push(lic);
    saveLicenses();

    // 📧 Mail senden
    try {
        await transporter.sendMail({
            from: MAIL_USER,
            to: email,
            subject: "Dein Excel Add-In Zugang",
            text: `
Hallo ${name},

dein Lizenzschlüssel:

${key}

Bitte lade die Installation herunter und starte die Update-Datei.

Viele Grüße
`
        });
    } catch (err) {
        console.log("Mail Fehler:", err);
    }

    res.json({ success: true, key });

});

// ========================
// 🔍 LICENSE CHECK
// ========================
app.post("/api/license/check", (req, res) => {

    const { key, machine } = req.body;

    let lic = licenses.find(l => l.key === key);

    if (!lic) {
        return res.json({ valid: false, reason: "invalid_key" });
    }

    // Ablauf prüfen
    if (new Date() > new Date(lic.expires)) {
        return res.json({ valid: false, reason: "expired" });
    }

    // 🔥 ERSTE AKTIVIERUNG
    if (!lic.activated) {
        lic.activated = true;
        lic.devices.push(machine);
        saveLicenses();
        return res.json({ valid: true });
    }

    // Geräte prüfen
    if (!lic.devices.includes(machine)) {
        return res.json({ valid: false, reason: "device_limit" });
    }

    res.json({ valid: true });

});

// ========================
// 📋 ALLE LIZENZEN
// ========================
app.get("/api/licenses", (req, res) => {
    res.json(licenses);
});

// ========================
// 🗑️ LIZENZ LÖSCHEN
// ========================
app.post("/api/license/delete", (req, res) => {

    const { key } = req.body;

    licenses = licenses.filter(l => l.key !== key);
    saveLicenses();

    res.json({ success: true });

});

// ========================
// 📧 ALLE EMAILS
// ========================
app.get("/api/emails", (req, res) => {
    res.json(licenses.map(l => l.email));
});

// ========================
// SERVER START
// ========================
app.listen(PORT, () => {
    console.log("Server läuft auf Port " + PORT);
});
