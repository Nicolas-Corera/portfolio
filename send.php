<?php
// Configuración de headers para JSON
header('Content-Type: application/json');

// CORS: solo aceptar requests desde tu sitio en Vercel
$allowed_origins = [
    'https://www.nicolascorera.com.ar',
    'https://nicolascorera.com.ar',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header('Access-Control-Allow-Origin: https://www.nicolascorera.com.ar');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Vary: Origin');

// Manejar OPTIONS request para CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Verificar que sea POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit();
}

// Importar PHPMailer
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'PHPMailer/src/Exception.php';
require 'PHPMailer/src/PHPMailer.php';
require 'PHPMailer/src/SMTP.php';

// ===========================
// CONFIGURACIÓN DE EMAIL
// ===========================
$email_destino   = "nicolas.corera@gmail.com";        // <-- Tu correo donde querés recibir los mensajes
$email_remitente = "nicolascorera@cuatromoles.com.ar"; // <-- Email desde el que se envía (debe existir en tu hosting)
$password_email  = "@DonQuijote18";       // <-- Contraseña del email remitente

// Configuración SMTP de DonWeb / Ferozo
$smtp_host   = "dtc036.ferozo.com";
$smtp_port   = 465;
$smtp_secure = 'ssl';

// ===========================
// OBTENER Y VALIDAR DATOS
// ===========================
$nombre  = isset($_POST['nombre'])  ? trim($_POST['nombre'])  : '';
$email   = isset($_POST['email'])   ? trim($_POST['email'])   : '';
$asunto  = isset($_POST['asunto'])  ? trim($_POST['asunto'])  : '';
$mensaje = isset($_POST['mensaje']) ? trim($_POST['mensaje']) : '';

// ===========================
// VALIDACIONES
// ===========================
$errores = [];

if (empty($nombre)) {
    $errores[] = 'El nombre es obligatorio';
}

if (empty($email)) {
    $errores[] = 'El email es obligatorio';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errores[] = 'El email no es válido';
}

if (empty($asunto)) {
    $errores[] = 'El asunto es obligatorio';
}

if (empty($mensaje)) {
    $errores[] = 'El mensaje es obligatorio';
}

// Si hay errores, retornar
if (!empty($errores)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Error en los datos enviados',
        'errores' => $errores
    ]);
    exit();
}

// ===========================
// EMAIL 1 → NOTIFICACIÓN A VOS
// ===========================
$cuerpo_admin = "<!DOCTYPE html>
<html lang='es'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Nuevo mensaje - Portfolio</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #0b0710;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 620px;
            margin: 0 auto;
            background: #150d22;
            border-radius: 14px;
            overflow: hidden;
            border: 1px solid rgba(188,59,255,0.25);
            box-shadow: 0 8px 30px rgba(0,0,0,0.5);
        }
        .header {
            background: linear-gradient(135deg, #6e1c9e 0%, #bc3bff 100%);
            color: white;
            padding: 32px 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: -0.5px;
        }
        .header p {
            margin: 8px 0 0;
            font-size: 13px;
            opacity: 0.85;
        }
        .content {
            padding: 30px;
        }
        .badge {
            display: inline-block;
            background: rgba(188,59,255,0.15);
            border: 1px solid rgba(188,59,255,0.35);
            color: #bc3bff;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            padding: 4px 12px;
            border-radius: 20px;
            margin-bottom: 20px;
        }
        .field-block {
            margin-bottom: 18px;
        }
        .field-label {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #a399b8;
            margin-bottom: 5px;
        }
        .field-value {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(188,59,255,0.15);
            border-radius: 8px;
            padding: 12px 15px;
            color: #f4eefa;
            font-size: 15px;
        }
        .field-value.mensaje-text {
            white-space: pre-wrap;
            line-height: 1.7;
        }
        .reply-btn {
            display: block;
            margin: 25px auto 0;
            padding: 13px 30px;
            background: linear-gradient(135deg, #6e1c9e, #bc3bff);
            color: #fff !important;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 700;
            font-size: 14px;
            text-align: center;
            letter-spacing: 0.5px;
        }
        .footer {
            background: rgba(255,255,255,0.02);
            padding: 16px 30px;
            text-align: center;
            font-size: 12px;
            color: #4a3a60;
            border-top: 1px solid rgba(188,59,255,0.1);
        }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>📬 Nuevo mensaje en tu portfolio</h1>
            <p>nicolascorera.com</p>
        </div>
        <div class='content'>
            <div class='badge'>Formulario de contacto</div>

            <div class='field-block'>
                <div class='field-label'>Nombre</div>
                <div class='field-value'>{$nombre}</div>
            </div>

            <div class='field-block'>
                <div class='field-label'>Email</div>
                <div class='field-value'><a href='mailto:{$email}' style='color:#bc3bff;text-decoration:none;'>{$email}</a></div>
            </div>

            <div class='field-block'>
                <div class='field-label'>Asunto</div>
                <div class='field-value'>{$asunto}</div>
            </div>

            <div class='field-block'>
                <div class='field-label'>Mensaje</div>
                <div class='field-value mensaje-text'>{$mensaje}</div>
            </div>

            <a href='mailto:{$email}?subject=Re: {$asunto}' class='reply-btn'>Responder a {$nombre}</a>
        </div>
        <div class='footer'>
            Nicolás Corera · Portfolio · nicolascorera.com
        </div>
    </div>
</body>
</html>";


// ===========================
// EMAIL 2 → CONFIRMACIÓN AL USUARIO
// ===========================
$cuerpo_confirmacion = "<!DOCTYPE html>
<html lang='es'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Mensaje recibido</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #0b0710;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 620px;
            margin: 0 auto;
            background: #150d22;
            border-radius: 14px;
            overflow: hidden;
            border: 1px solid rgba(188,59,255,0.25);
            box-shadow: 0 8px 30px rgba(0,0,0,0.5);
        }
        .header {
            background: linear-gradient(135deg, #6e1c9e 0%, #bc3bff 100%);
            color: white;
            padding: 32px 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
        }
        .header p {
            margin: 8px 0 0;
            font-size: 13px;
            opacity: 0.85;
        }
        .content {
            padding: 30px;
            color: #f4eefa;
        }
        .saludo {
            font-size: 22px;
            font-weight: 700;
            color: #f4eefa;
            margin-bottom: 10px;
        }
        .saludo span {
            color: #bc3bff;
        }
        .intro {
            color: #a399b8;
            font-size: 15px;
            margin-bottom: 28px;
        }
        .resumen-box {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(188,59,255,0.2);
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 25px;
        }
        .resumen-title {
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #bc3bff;
            margin-bottom: 15px;
        }
        .info-row {
            display: flex;
            padding: 9px 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            font-size: 14px;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .info-label {
            flex: 0 0 90px;
            color: #a399b8;
            font-weight: 500;
        }
        .info-value {
            flex: 1;
            color: #f4eefa;
        }
        .footer {
            background: rgba(255,255,255,0.02);
            padding: 16px 30px;
            text-align: center;
            font-size: 12px;
            color: #4a3a60;
            border-top: 1px solid rgba(188,59,255,0.1);
        }
        .footer a {
            color: #bc3bff;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>✅ Mensaje recibido</h1>
            <p>Portfolio de Nicolás Corera</p>
        </div>
        <div class='content'>
            <div class='saludo'>¡Hola, <span>{$nombre}</span>!</div>
            <p class='intro'>
                Recibí tu mensaje y te responderé a la brevedad.<br>
                Gracias por ponerte en contacto.
            </p>

            <div class='resumen-box'>
                <div class='resumen-title'>Tu mensaje</div>
                <div class='info-row'>
                    <div class='info-label'>Asunto</div>
                    <div class='info-value'><strong>{$asunto}</strong></div>
                </div>
                <div class='info-row' style='align-items:flex-start;'>
                    <div class='info-label'>Mensaje</div>
                    <div class='info-value' style='white-space:pre-wrap;'>{$mensaje}</div>
                </div>
            </div>
        </div>
        <div class='footer'>
            <p>Nicolás Corera · Full Stack Developer · Argentina</p>
            <p>
                <a href='https://github.com/Nicolas-Corera'>GitHub</a> &nbsp;·&nbsp;
                <a href='https://www.linkedin.com/in/nicolas-corera-7095ba397/'>LinkedIn</a>
            </p>
            <p style='margin-top:10px;font-size:11px;color:#2a1d3e;'>
                Este es un mensaje automático, por favor no respondas a este correo.
            </p>
        </div>
    </div>
</body>
</html>";


// ===========================
// ENVIAR AMBOS EMAILS
// ===========================
try {
    $mail = new PHPMailer(true);

    // Servidor SMTP
    $mail->isSMTP();
    $mail->Host       = $smtp_host;
    $mail->SMTPAuth   = true;
    $mail->Username   = $email_remitente;
    $mail->Password   = $password_email;
    $mail->SMTPSecure = $smtp_secure;
    $mail->Port       = $smtp_port;
    $mail->CharSet    = 'UTF-8';

    // ── Email 1: a vos ──
    $mail->setFrom($email_remitente, 'Portfolio · Nicolás Corera');
    $mail->addAddress($email_destino);
    $mail->addReplyTo($email, $nombre);

    $mail->isHTML(true);
    $mail->Subject = "Nuevo mensaje de {$nombre} — Portfolio";
    $mail->Body    = $cuerpo_admin;
    $mail->AltBody = strip_tags($cuerpo_admin);

    $mail->send();

    // ── Email 2: confirmación al usuario ──
    $mail->clearAddresses();
    $mail->clearReplyTos();

    $mail->addAddress($email, $nombre);
    $mail->addReplyTo($email_destino, 'Nicolás Corera');

    $mail->Subject = '¡Recibí tu mensaje! — Nicolás Corera';
    $mail->Body    = $cuerpo_confirmacion;
    $mail->AltBody = strip_tags($cuerpo_confirmacion);

    $mail->send();

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => '¡Mensaje enviado con éxito! Te responderé pronto.'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al enviar el mensaje: ' . $mail->ErrorInfo
    ]);
}