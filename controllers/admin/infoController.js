
const InfoTag = require("../../models/infoschema")



    // Get admin page to manage info tags
   const getinfoPage = async (req, res) => {
        try {
            const infoTags = await InfoTag.find().sort({ createdAt: -1 });
            res.render('info-tags', { infoTags });
        } catch (error) {
            res.status(500).send('Server error');
        }
    };

    // Create new info tag
   const createInfoTag = async (req, res) => {
        try {
            const { message, startDate, endDate } = req.body;
            const newInfoTag = new InfoTag({
                message,
                startDate,
                endDate
            });
            await newInfoTag.save();
            res.redirect('info-tags');
        } catch (error) {
            res.status(500).send('Server error');
        }
    };

    // Delete info tag
     const deleteInfoTag = async (req, res) => {
        try {
            await InfoTag.findByIdAndDelete(req.params.id);
            res.redirect('/admin/info-tags');
        } catch (error) {
            res.status(500).send('Server error');
        }
    };

    // Get active info tag for header
     const getActiveInfoTag =  async (req, res) => {
        try {
            const currentDate = new Date();
            const activeTag = await InfoTag.findOne({
                isActive: true,
                startDate: { $lte: currentDate },
                endDate: { $gte: currentDate }
            });
            res.json(activeTag);
        } catch (error) {
            res.status(500).json({ error: 'Server error' });
        }
    }


module.exports = {
    getinfoPage,
    createInfoTag,
    deleteInfoTag,
    getActiveInfoTag


};