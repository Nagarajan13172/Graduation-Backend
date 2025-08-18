// src/controllers/adminController.js

exports.adminLogin = (req, res) => {
  const { username, password } = req.body;

  // 🔑 Simple hardcoded login — make secure later
  if (username === 'admin' && password === 'secret123') {
    return res.json({ token: 'admin-access-token' });
  } else {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
};
