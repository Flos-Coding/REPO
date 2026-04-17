const fs = require("fs");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

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
// TEST
// ========================
app.get("/", (req, res) => {
    res.send("License Server läuft 🚀");
});

// ========================
// LICENSE CHECK
// ========================
app.post("/api/license/check", (req, res) => {

    const { key, machine } = req.body;

    // 🔍 Lizenz anhand KEY finden
    let lic = licenses.find(l => l.key === key);

    if (!lic) {
        return res.json({ valid: false, reason: "invalid_key" });
    }

    // ⏰ Ablauf prüfen
    const today = new Date();
    const exp = new Date(lic.expires);

    if (today > exp) {
        return res.json({ valid: false, reason: "expired" });
    }

    // 📱 Gerät prüfen
    if (!lic.devices.includes(machine)) {

        if (lic.devices.length >= lic.device_limit) {
            return res.json({ valid: false, reason: "device_limit" });
        }

        lic.devices.push(machine);
        fs.writeFileSync("licenses.json", JSON.stringify(licenses, null, 2));
    }

    res.json({ valid: true });

});

app.listen(process.env.PORT || 3000);
