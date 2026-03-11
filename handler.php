<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'vendor/autoload.php'; // Charge PHPMailer si installé avec Composer

$mail = new PHPMailer(true);
$mail_subject = 'Message provenant du portfolio';
$mail_to_email = 'scorpion@ralf-lionel.com'; // my email
$mail_to_name = 'Portfolio';
$my_personnal_email = 'ralflionel120@gmail.com';

try {

	$mail_from_email = isset($_POST['email']) ? $_POST['email'] : '';
	$mail_from_name = isset($_POST['name']) ? $_POST['name'] : '';
	// $mail_category = isset( $_POST['category'] ) ? $_POST['category'] : '';
	$mail_message = isset($_POST['message']) ? $_POST['message'] : '';

	// Server settings
	$mail->isSMTP(); // Send using SMTP
	$mail->Host = 'mail.ralf-lionel.com'; // Set the SMTP server to send through
	$mail->SMTPAuth = true; // Enable SMTP authentication
	$mail->Username = 'scorpion@ralf-lionel.com'; // SMTP username
	$mail->Password = 'Hc7bR6gyqyBsNHgKWCHQ'; // SMTP password
	$mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS; // Enable TLS encryption; `PHPMailer::ENCRYPTION_SMTPS` encouraged
	$mail->Port = 587; // TCP port to connect to, use 465 for `PHPMailer::ENCRYPTION_SMTPS` above

	$mail->setFrom($mail_to_email, $mail_to_name); // my email
	$mail->addAddress($my_personnal_email, $mail_from_name); // Add a recipient

	if (isset($_FILES['file_attach']) && is_array($_FILES['file_attach']['tmp_name'])) {
		for ($ct = 0; $ct < count($_FILES['file_attach']['tmp_name']); $ct++) {
			if ($_FILES['file_attach']['error'][$ct] === UPLOAD_ERR_OK) { 
				$mail->AddAttachment(
					$_FILES['file_attach']['tmp_name'][$ct], 
					$_FILES['file_attach']['name'][$ct]
				);
			}
		}
	}
	

	// Content


	$mail->Subject = $mail_subject;
	$mail->Body = '
		 
		<strong>Nom:</strong> ' . $mail_from_name . '<br>
		<strong>Email:</strong> ' . $mail_from_email . '<br>
		<strong>Message:</strong> ' . $mail_message;
		
	$mail->isHTML(true); // Set email format to HTML
	$mail->Send();

	echo 'Message est bien envoyé';
} catch (Exception $e) {

	echo "Message non envoyé ! Un erreur s'est produit: {$mail->ErrorInfo}";
}
