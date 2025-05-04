export const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  req.flash('error_msg', 'Você precisa estar logado para acessar esta página');
  res.redirect('/auth/login');
};

export const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  req.flash('error_msg', 'Acesso negado. Apenas administradores podem acessar esta página');
  res.redirect('/');
}; 