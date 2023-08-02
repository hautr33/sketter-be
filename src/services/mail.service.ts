import { createTransport } from 'nodemailer';
import { EMAIL_SERVICE, EMAIL_USERNAME, EMAIL_PASSWORD } from '../config/default';

/**
 * This method allow Node App to send email to the
 *  client with specific transporter (HOST, PORT)
 *
 * Requires to have env file to read HOST, PORT
 *  USERNAME & PASSWORD
 *
 * Options are provided to custom the Destination
 *  address, subject and contents
 * @param {*} options
 */
export async function sendEmail(options: {
	email: string;
	subject: string;
	message: string;
}): Promise<any> {
	// TODO 1) Create a transporter
	const transporter = createTransport({
		service: EMAIL_SERVICE,
		// port: EMAIL_PORT,
		auth: {
			user: EMAIL_USERNAME,
			pass: EMAIL_PASSWORD
		}
	} as any);

	// TODO 2) Define the email options
	const mailOptions = {
		from: 'Sketter Security<security@sketter.io>',
		to: options.email,
		subject: options.subject,
		text: options.message
		// html:
	};

	// TODO 3) Actually send the email
	await transporter.sendMail(mailOptions);
}