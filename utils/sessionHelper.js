const getSessionMessage = (req) => {
    const message = req.session.message || "";
    const type = req.session.type || "";

    req.session.message = "";
    req.session.type = "";

    return {message, type};
}

module.exports = {
    getSessionMessage,
    
}