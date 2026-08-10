<?php
// Local dev router for `php -S host:port router.php`
// Mirrors the .htaccess clean-URL rules so /products works the same as on cPanel.
// NOT deployed to cPanel — only used locally.

// parse_url leaves the path percent-encoded, so a real file whose name contains a
// space or bracket ("images/quality (1).png" -> "/images/quality%20(1).png") never
// matched file_exists() and fell through to the 404 page. Apache decodes the path
// for us on cPanel, so this only ever broke local dev. Decode to match.
$uri = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// Strip leading slash for file lookup
$file = __DIR__ . $uri;

// 1. Serve real files (CSS, JS, images, PHP API, etc.) directly
if ($uri !== '/' && file_exists($file) && !is_dir($file)) {
    return false; // let PHP built-in server handle it
}

// 2. Map clean URLs to .html equivalents
$clean = rtrim($uri, '/');
$pages = ['products', 'about', 'contact', 'enquiry', 'compare', 'product-detail'];

if ($clean === '' || $clean === '/') {
    include __DIR__ . '/index.html';
    exit;
}

foreach ($pages as $page) {
    if ($clean === '/' . $page) {
        include __DIR__ . '/' . $page . '.html';
        exit;
    }
}

// 3. Admin sub-pages
if (preg_match('#^/admin(/.*)?$#', $clean, $m)) {
    $sub = isset($m[1]) ? ltrim($m[1], '/') : '';
    $adminFile = __DIR__ . '/admin/' . ($sub ?: 'dashboard') . '.html';
    if (file_exists($adminFile)) {
        include $adminFile;
        exit;
    }
}

// 4. 404
http_response_code(404);
include __DIR__ . '/404.html';
