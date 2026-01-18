const adminAuth = (req, res, next)=>{
    if (req.session.admin) {
        return next();
    }
    return res.redirect("/admin/login");
 }

 const preventBackToLogin = (req, res, next) => {
   if(req.session.admin) {
      return res.redirect('/admin/customer');
   }
   next();
 }

 module.exports = {
    adminAuth,
    preventBackToLogin
 }