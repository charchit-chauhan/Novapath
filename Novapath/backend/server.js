import express from "express";
import cors from "cors";
import multer from "multer";
const app = express();
const PORT = 5000;
app.use(cors({
    origin: "http://localhost:5173",
}));
app.use(express.json());
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
});
// Test route
app.get("/", (_req, res) => {
    res.json({
        message: "NovaPath backend is running 🚀",
    });
});
// Roadmap image upload
app.post("/api/roadmaps/upload", upload.single("roadmap"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No roadmap image uploaded.",
            });
        }
        const hoursPerDay = Number(req.body.hoursPerDay || 2);
        console.log("Roadmap received:", req.file.originalname);
        console.log("Hours per day:", hoursPerDay);
        return res.json({
            success: true,
            message: "Roadmap image received successfully.",
            fileName: req.file.originalname,
            fileSize: req.file.size,
            hoursPerDay,
        });
    }
    catch (error) {
        console.error("Upload error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to process roadmap.",
        });
    }
});
app.listen(PORT, () => {
    console.log(`NovaPath backend running at http://localhost:${PORT}`);
});
