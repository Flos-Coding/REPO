const fs = require("fs");
const licenses = JSON.parse(fs.readFileSync("licenses.json"));

const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Excel License Server läuft 🚀");
});

// 🔥 EINZIGE STELLE FÜR VERSION
const APP_VERSION = "1.0.1";

const GITHUB_USER = "Flos-Coding";
const GITHUB_REPO = "REPO";
const FILE_NAME = "workflow_addin.xlam";

// Version API
app.get("/version.json", (req, res) => {

    res.json({
        version: APP_VERSION,
        download: "https://repo-vnlk.onrender.com/download/latest"
    });

});

// Download Proxy (wichtig!)
app.get("/download/latest", async (req, res) => {
    try {
        const url =
            `https://github.com/${GITHUB_USER}/${GITHUB_REPO}` +
            `/releases/download/v${APP_VERSION}/${FILE_NAME}`;

        const response = await axios.get(url, {
            responseType: "arraybuffer"
        });

        res.setHeader("Content-Type",
            "application/vnd.ms-excel.addin.macroEnabled.12"
        );

        res.send(response.data);

    } catch (err) {
        res.status(500).send("Download failed");
    }
});

app.listen(process.env.PORT || 3000);


