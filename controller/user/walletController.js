const Wallet = require("../../models/walletModel");
const WalletTransaction = require("../../models/walletTransactionModel");
const { getSessionMessage } = require("../../utils/sessionHelper");

const STATUS_CODES = require("../../constants/statusCodes");

const getWalletPage = async (req, res) => {
    try {

        const { message, type } = getSessionMessage(req);

        const userId = req.user._id;

        let page = parseInt(req.query.page) || 1;
        const limit = 7; 
        const skip = (page - 1) * limit;

        const wallet = await Wallet.findOne({ user_id: userId });

        const totalTransactions = await WalletTransaction.countDocuments({ user_id: userId });

        const transactions = await WalletTransaction.find({ user_id: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(totalTransactions / limit);

        res.render("user/wallet", {
            wallet,
            transactions,
            currentPage: page,
            totalPages,
            message, 
            type
        });

    } catch (error) {
        console.log(error);
    }
};

module.exports = {
    getWalletPage
}