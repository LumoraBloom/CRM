/**
 * Lumora Bloom Banquet CRM - MongoDB Backend Server
 * Raj Nagar Extension, Ghaziabad / Delhi NCR
 * 
 * Instructions to run:
 * 1. Install dependencies: `npm install`
 * 2. Set your MongoDB URI in .env or replace MONGODB_URI below
 * 3. Run the server: `npm start`
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const Lead = require('./models/Lead');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lumora_bloom_crm';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('🌟 Successfully connected to Lumora Bloom MongoDB Database!'))
.catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    console.log('💡 Note: If running without a local MongoDB instance, configure your Atlas connection string in .env');
});

// Multer setup for Excel File Imports
const upload = multer({ dest: 'uploads/' });

// ==========================================
// REST API ENDPOINTS FOR BANQUET CRM
// ==========================================

/**
 * 1. GET /api/leads
 * Fetch all leads with optional filtering (status, event, search text)
 */
app.get('/api/leads', async (req, res) => {
    try {
        const { status, event, search } = req.query;
        let query = {};

        if (status && status !== 'ALL') {
            query.status = status;
        }
        if (event && event !== 'ALL') {
            query.event = event;
        }
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { remarks: { $regex: search, $options: 'i' } }
            ];
        }

        const leads = await Lead.find(query).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: leads.length, data: leads });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 2. GET /api/leads/today-followups
 * Fetch leads that need follow-up today or are overdue
 */
app.get('/api/leads/today-followups', async (req, res) => {
    try {
        const todayStr = new Date().toISOString().split('T')[0];
        const calls = await Lead.find({
            status: { $nin: ['Dead Lead', 'Booked / Won'] },
            followup: { $lte: todayStr }
        }).sort({ followup: 1 });

        res.status(200).json({ success: true, count: calls.length, data: calls });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 3. POST /api/leads
 * Create a new banquet inquiry lead
 */
app.post('/api/leads', async (req, res) => {
    try {
        const newLead = await Lead.create(req.body);
        res.status(201).json({ success: true, message: 'Banquet lead created successfully!', data: newLead });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * 4. PUT /api/leads/:id
 * Update an existing lead (e.g., advancing stage in Pipeline or updating notes)
 */
app.put('/api/leads/:id', async (req, res) => {
    try {
        const updatedLead = await Lead.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!updatedLead) {
            return res.status(404).json({ success: false, error: 'Lead not found in database' });
        }
        res.status(200).json({ success: true, message: 'Lead updated successfully!', data: updatedLead });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * 5. DELETE /api/leads/:id
 * Delete a lead
 */
app.delete('/api/leads/:id', async (req, res) => {
    try {
        const deleted = await Lead.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Lead not found' });
        }
        res.status(200).json({ success: true, message: 'Lead deleted from database' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 6. POST /api/leads/import
 * Bulk import leads from Excel (.xlsx) or CSV file into MongoDB
 */
app.post('/api/leads/import', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Please upload an Excel or CSV file' });
        }

        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (rows.length === 0) {
            return res.status(400).json({ success: false, error: 'No data found in uploaded file' });
        }

        const leadsToInsert = rows.map(r => ({
            name: r['Name'] || r['Client Name'] || r['name'] || 'Unknown Client',
            phone: String(r['Contact Number'] || r['Phone'] || r['Contact'] || r['phone'] || ''),
            event: r['Event Type'] || r['Event'] || 'Wedding',
            date: r['Event Date'] || r['Date'] || '2026-11-25',
            guests: parseInt(r['Guests'] || r['Guest Count']) || 300,
            budget: parseInt(r['Budget'] || r['Estimated Budget']) || 500000,
            status: r['Status'] || 'New Inquiry',
            followup: r['Follow-up Date'] || r['Followup'] || new Date().toISOString().split('T')[0],
            remarks: r['Remarks'] || r['Notes'] || 'Imported via Excel upload'
        })).filter(l => l.phone !== '');

        const inserted = await Lead.insertMany(leadsToInsert);
        res.status(201).json({
            success: true,
            message: `Successfully imported ${inserted.length} banquet leads into MongoDB!`,
            data: inserted
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 7. GET /
 * Serve the standalone CRM Web Dashboard
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'lumora_bloom_crm.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Lumora Bloom Banquet CRM Backend Server running on http://localhost:${PORT}`);
    console.log(`📊 Open http://localhost:${PORT} in your browser to access the CRM Dashboard!`);
});
