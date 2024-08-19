    const express = require('express');
    const app = express();
    const path = require('path');
    const multer = require('multer');
    const mysql = require('mysql2');
    const bcrypt = require('bcrypt');
    const bodyParser = require('body-parser');
    const session = require('express-session');
    const connection = require('./db');

    // Setup multer storage
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, path.join(__dirname, 'public/uploads'));
        },
        filename: function (req, file, cb) {
            cb(null, Date.now() + path.extname(file.originalname));
        }
    });

    const upload = multer({ storage: storage });

    // Setup session
    app.use(session({
        secret: 's3cr3tK3y!@2024$#%Secure', // Ganti dengan string secret Anda
        resave: false,
        saveUninitialized: true
    }));

    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));

    // Serve static files
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(bodyParser.urlencoded({ extended: true }));

    // Show index page
    app.get('/', (req, res) => {
        const searchQuery = req.query.search_query || '';
        const sql = 'SELECT * FROM products WHERE name LIKE ?';
        connection.query(sql, [`%${searchQuery}%`], (err, results) => {
            if (err) return res.send("Error: " + err.message);
            res.render('index', { products: results, search_query: searchQuery });
        });
    });

    // Show register page
    app.get('/register', (req, res) => {
        res.render('register');
    });

    // Handle register form submission
    app.post('/register', upload.single('foto'), (req, res) => {
        const { username, email, password, confirm_password } = req.body;
        const foto = req.file ? req.file.filename : ''; // Simpan nama file saja

        if (password !== confirm_password) {
            return res.send("Passwords do not match.");
        }

        const hashedPassword = bcrypt.hashSync(password, 10);

        const sql = "INSERT INTO users (username, email, password, foto) VALUES (?, ?, ?, ?)";
        connection.query(sql, [username, email, hashedPassword, foto], (err, results) => {
            if (err) return res.send("Error: " + err.message);
            res.redirect('/login');
        });
    });

    // Show login page
    app.get('/login', (req, res) => {
        res.render('login');
    });

    // Handle login form submission
    // Handle login form submission
    app.post('/login', (req, res) => {
        const { username, password } = req.body;

        const sql = "SELECT * FROM users WHERE username = ? OR email = ?";
        connection.query(sql, [username, username], (err, results) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Database error: " + err.message });
            }

            if (results.length > 0) {
                const user = results[0];
                if (bcrypt.compareSync(password, user.password)) {
                    req.session.userId = user.id;
                    req.session.username = user.username;
                    req.session.profilePicture = user.foto;
                    return res.redirect('/user');
                } else {
                    return res.json({ success: false, message: "Login gagal. Periksa kembali username dan password Anda." });
                }
            } else {
                return res.json({ success: false, message: "Login gagal. Periksa kembali username dan password Anda." });
            }
        });
    });

    // Show user page
    app.get('/user', (req, res) => {
        if (!req.session.userId) {
            return res.redirect('/login');
        }

        const profilePicture = req.session.profilePicture || 'default-profile.jpg';
        const searchQuery = req.query.search_query || '';
        const userId = req.session.userId; // Get userId from session

        const sqlProducts = 'SELECT * FROM products WHERE name LIKE ?';
        connection.query(sqlProducts, [`%${searchQuery}%`], (err, products) => {
            if (err) return res.send("Error: " + err.message);
            res.render('user', {
                profile_picture: profilePicture,
                products: products,
                search_query: searchQuery,
                userId: userId // Pass userId to the template
            });
        });
    });

    // Show profile page
    app.get('/profile', (req, res) => {
        if (!req.session.userId) {
            return res.redirect('/login');
        }

        const sql = "SELECT username, no_hp, alamat, foto FROM users WHERE id = ?";
        connection.query(sql, [req.session.userId], (err, result) => {
            if (err) return res.send("Error: " + err.message);
            if (result.length > 0) {
                const user = result[0];
                res.render('profile_user', {
                    username: user.username,
                    user_phone: user.no_hp,
                    user_address: user.alamat,
                    profile_picture: user.foto
                });
            } else {
                res.send("User not found.");
            }
        });
    });

    app.get('/history', (req, res) => {
        const profilePicture = req.session.profilePicture || 'default-profile.jpg';
        const searchQuery = req.query.search_query || '';
        const userId = req.session.userId;
        const products = [
            { name: 'Kastengel Keju', price: 58000, discounted_price: 50000, date: '20 - 07 - 2024', gambar: 'kastengel.jpg' },
            { name: 'Putri Salju', price: 45000, discounted_price: 40000, date: '23 - 06 - 2024', gambar: 'putri salju.jpg' },
            { name: 'Kastengel Keju', price: 58000, discounted_price: 50000, date: '24 - 07 - 2024', gambar: 'kastengel.jpg' }
        ];
        app.use(express.static('public'));
        res.render('history', { products: products, profile_picture: profilePicture, search_query: searchQuery });
    });
    

    app.get('/products', (req, res) => {
        let sql_search = "SELECT product_id, name, price, stock, gambar FROM products";
        const search_query = req.query.search_query;
    
        if (search_query) {
            sql_search += " WHERE name LIKE ?";
        }
    
        connection.query(sql_search, ['%' + search_query + '%'], (err, results) => {
            if (err) throw err;
            res.render('product_guest', {
                search_results: results,
                search_query: search_query || ''
            });
        });
    });

    
    // Show update profile page
    app.get('/update-profile', (req, res) => {
        if (!req.session.userId) {
            return res.redirect('/login');
        }

        const sql = "SELECT username, no_hp, alamat, foto FROM users WHERE id = ?";
        connection.query(sql, [req.session.userId], (err, result) => {
            if (err) return res.send("Error: " + err.message);
            if (result.length > 0) {
                const user = result[0];
                res.render('update_profile', {
                    username: user.username,
                    user_phone: user.no_hp,
                    user_address: user.alamat,
                    profile_picture: user.foto
                });
            } else {
                res.send("User not found.");
            }
        });
    });
    app.post('/update', upload.single('profilePic'), (req, res) => {
        const { username, no_hp, alamat } = req.body;
        const profilePic = req.file ? req.file.filename : req.body.currentProfilePic;

        const sql = "UPDATE users SET username = ?, no_hp = ?, alamat = ?, foto = ? WHERE id = ?";
        connection.query(sql, [username, no_hp, alamat, profilePic, req.session.userId], (err, result) => {
            if (err) return res.send("Error: " + err.message);
            req.session.username = username;
            req.session.profilePicture = profilePic; // Update session profile picture
            res.redirect('/profile');
        });
    });

    app.post('/add-to-cart', (req, res) => {
        const productId = req.body.product_id;
        const userId = req.session.userId; // Pastikan user sudah login

        const sql = 'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, 1)';

        connection.query(sql, [userId, productId], (err, result) => {
            if (err) {
                console.error('Database Error:', err.message);
                return res.status(500).json({ success: false, message: 'Gagal menambahkan produk ke keranjang.' });
            }
            return res.status(200).json({ success: true, message: 'Produk berhasil ditambahkan ke keranjang!' });
        });
    });

    app.get('/cart', (req, res) => {
        if (!req.session.userId) {
            return res.redirect('/login');
        }
    
        const userId = req.session.userId;
        const searchQuery = req.query.search_query || '';
    
        const sql = `
            SELECT p.name, p.price, c.quantity, p.gambar
            FROM cart c 
            JOIN products p ON c.product_id = p.product_id 
            WHERE c.user_id = ?`;
    
        connection.query(sql, [userId], (err, results) => {
            if (err) return res.send("Error: " + err.message);
    
            res.render('cart', { 
                cartItems: results,
                profile_picture: req.session.profilePicture || 'default-profile.jpg',
                search_query: searchQuery
            });
        });
    });
    
    app.get('/search', (req, res) => {
        if (!req.session.userId) {
            return res.redirect('/login');
        }

        const profilePicture = req.session.profilePicture || 'default-profile.jpg';
        const searchQuery = req.query.search_query || '';
        const userId = req.session.userId; // Get userId from session

        const sqlProducts = 'SELECT * FROM products WHERE name LIKE ?';
        connection.query(sqlProducts, [`%${searchQuery}%`], (err, products) => {
            if (err) return res.send("Error: " + err.message);
            res.render('user', {
                profile_picture: profilePicture,
                products: products,
                search_query: searchQuery,
                userId: userId // Pass userId to the template
            });
        });
    });
app.post('/create-order', (req, res) => {
        const selectedProducts = req.body.selectedProducts; // Array of selected product IDs
        
        if (!selectedProducts || selectedProducts.length === 0) {
            return res.status(400).json({ success: false, message: "No products selected." });
        }
    
        const userId = req.session.userId;
        const orderData = selectedProducts.map(productId => [userId, productId, 1, 'pending']); // Menambahkan status 'pending'
        
        // Query untuk menyimpan pesanan dengan status 'pending'
        const query = "INSERT INTO orders (user_id, product_id, quantity, status) VALUES ?";
    
        connection.query(query, [orderData], (err, result) => {
            if (err) {
                console.error("Database Error:", err);
                return res.status(500).json({ success: false, message: "Gagal membuat pesanan." });
            }
    
            // Hapus produk yang sudah dibeli dari keranjang
            const sqlClearCart = 'DELETE FROM cart WHERE user_id = ? AND product_id IN (?)';
            connection.query(sqlClearCart, [userId, selectedProducts], (err, result) => {
                if (err) {
                    console.error('Database Error:', err.message);
                    return res.status(500).json({ success: false, message: 'Gagal mengosongkan keranjang.' });
                }
                return res.redirect('/orders');            });
        });
    });
    
    
    app.get('/orders', (req, res) => {
        if (!req.session.userId) {
            return res.redirect('/login');
        }
        
        const userId = req.session.userId;
        const sql = 'SELECT * FROM orders WHERE user_id = ? ORDER BY order_date DESC';
        
        connection.query(sql, [userId], (err, results) => {
            if (err) return res.send("Error: " + err.message);
            
            res.render('order', { 
                orders: results, 
                profile_picture: req.session.profilePicture || 'default-profile.jpg', 
                search_query: req.query.search_query || '' // Menyertakan variabel dengan nilai default
        
            });
        });
        
    });
    

    app.post('/remove-from-cart', (req, res) => {
        const cartItemId = req.body.cart_item_id;
        const sql = 'DELETE FROM cart WHERE id = ?';
        connection.query(sql, [cartItemId], (err, result) => {
            if (err) {
                console.error('Database Error:', err.message);
                return res.status(500).json({ success: false, message: 'Gagal menghapus produk dari keranjang.' });
            }
            return res.status(200).json({ success: true, message: 'Produk berhasil dihapus dari keranjang!' });
        });
    });

    app.post('/update-order-status', (req, res) => {
        const { orderId, newStatus } = req.body;
        const sql = 'UPDATE orders SET status = ? WHERE order_id = ?';
        connection.query(sql, [newStatus, orderId], (err, result) => {
            if (err) {
                console.error('Database Error:', err.message);
                return res.status(500).json({ success: false, message: 'Gagal memperbarui status pesanan.' });
            }
            return res.status(200).json({ success: true, message: 'Status pesanan berhasil diperbarui!' });
        });
    });
    
    app.get('/product_user', (req, res) => {
        if (!req.session.userId) {
            return res.redirect('/login');
        }
    
        const profilePicture = req.session.profilePicture || 'default-profile.jpg';
        const searchQuery = req.query.search_query || '';
        const userId = req.session.userId; // Get userId from session
    
        // Query untuk mendapatkan produk berdasarkan pencarian
        const sqlProducts = 'SELECT * FROM products WHERE name LIKE ?';
        connection.query(sqlProducts, [`%${searchQuery}%`], (err, products) => {
            if (err) return res.send("Error: " + err.message);
    
            // Render halaman dengan data yang diperlukan
            res.render('product_user', {
                profile_picture: profilePicture,
                products: products, // Kirim variabel products ke template
                search_query: searchQuery,
                userId: userId // Pass userId to the template
            });
        });
    });
    
    app.listen(3000, () => {
        console.log('Server is running on port 3000');
    });
