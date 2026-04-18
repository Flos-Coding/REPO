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

const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASS = process.env.MAIL_PASS;
const ADMIN_KEY = process.env.ADMIN_KEY;

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
// 🔒 ADMIN SCHUTZ
// ========================
function checkAdmin(req, res, next) {
    const key = req.headers["x-api-key"];

    if (key !== ADMIN_KEY) {
        return res.status(403).json({ error: "Forbidden" });
    }

    next();
}

// ========================
// 🔑 KEY GENERATOR (EINDEUTIG)
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

    let key;

    do {
        key = "FLO-" + block(5) + "-" + block(5) + "-" + block(5);
    } while (licenses.find(l => l.key === key));

    return key;
}

// ========================
// 📧 LIZENZ ERSTELLEN
// ========================
app.post("/api/license/create", checkAdmin, (req, res) => {

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

    if (new Date() > new Date(lic.expires)) {
        return res.json({ valid: false, reason: "expired" });
    }

    // Erste Aktivierung
    if (!lic.activated) {
        lic.activated = true;
        lic.devices.push(machine);
        saveLicenses();
        return res.json({ valid: true });
    }

    // Geräteprüfung
    if (!lic.devices.includes(machine)) {
        return res.json({ valid: false, reason: "device_limit" });
    }

    res.json({ valid: true });

});

// ========================
// 📋 ALLE LIZENZEN
// ========================
app.get("/api/licenses", checkAdmin, (req, res) => {
    res.json(licenses);
});

// ========================
// 🗑️ LIZENZ LÖSCHEN
// ========================
app.post("/api/license/delete", checkAdmin, (req, res) => {

    const { key } = req.body;

    licenses = licenses.filter(l => l.key !== key);
    saveLicenses();

    res.json({ success: true });

});

// ========================
// 📧 MAIL AN USER
// ========================
app.post("/api/sendmail", checkAdmin, async (req, res) => {

    const { name, email, key } = req.body;

    try {
        await transporter.sendMail({
            from: MAIL_USER,
            to: email,
            subject: "Dein Excel Add-In Zugang",
            text: `
Hallo ${name},

dein Lizenzschlüssel:

${key}

Installationsanleitung:
1. Add-In installieren
2. Excel starten
3. Key eingeben

Viel Erfolg!
`
        });

        res.json({ success: true });

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Mail Fehler", detail: err.message });
    }

});

// ========================
// 📧 ALLE EMAILS
// ========================
app.get("/api/emails", checkAdmin, (req, res) => {
    res.json(licenses.map(l => l.email));
});

// ========================
// SERVER START
// ========================
app.listen(PORT, () => {
    console.log("Server läuft auf Port " + PORT);
});
