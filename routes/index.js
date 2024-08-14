const express = require('express');
const app = express();
const path = require('path');
const connection = require('./db'); // Pastikan path ke file koneksi database benar

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    let search_query = req.query.search_query || '';
    let sql = 'SELECT * FROM products WHERE name LIKE ?';
    connection.query(sql, [`%${search_query}%`], (err, results) => {
        if (err) throw err;
        res.render('index', {
            search_query: search_query,
            products: results
        });
    });
});


app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
