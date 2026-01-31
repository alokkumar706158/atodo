require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// PostgreSQL Connection Pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Cloud DBs (Neon/Render)
});

// Initialize Database Table
const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                text TEXT NOT NULL,
                completed BOOLEAN DEFAULT FALSE
            )
        `);
        console.log('✅ Tasks Table Ready');
    } catch (err) {
        console.error('❌ Database Init Error:', err);
    }
};
initDB();

// --- ROUTES ---

// GET: Fetch all tasks
app.get('/tasks', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tasks ORDER BY id DESC');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
    }
});

// Default Route
app.get('/', (req, res) => {
    res.send('Backend is Working! 🚀 Check /tasks for data.');
});

// POST: Add new task
app.post('/tasks', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'Task text is required' });

        const result = await pool.query(
            'INSERT INTO tasks (text, completed) VALUES ($1, $2) RETURNING *',
            [text, false]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: 'Error saving task' });
    }
});

// PUT: Toggle Task Completion
app.put('/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { completed } = req.body;
        
        const result = await pool.query(
            'UPDATE tasks SET completed = $1 WHERE id = $2 RETURNING *',
            [completed, id]
        );
        
        if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: 'Error updating task' });
    }
});

// DELETE: Remove task
app.delete('/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
        res.json({ message: 'Task deleted' });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: 'Error deleting task' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));