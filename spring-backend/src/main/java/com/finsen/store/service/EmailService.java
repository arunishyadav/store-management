package com.finsen.store.service;

import com.finsen.store.entity.Role;
import com.finsen.store.entity.User;
import com.finsen.store.repository.UserRepository;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Autowired
    private UserRepository userRepository;

    @Value("${spring.mail.username:}")
    private String senderEmail;

    public void sendAuditEmail(User currentUser, String action, String dataDetails, String locationName) {
        try {
            List<User> admins = userRepository.findByRole(Role.SUPER_ADMIN);
            
            for (User admin : admins) {
                if (admin.getEmail() != null && !admin.getEmail().isBlank()) {
                    SimpleMailMessage message = new SimpleMailMessage();
                    
                    String from = (senderEmail != null && !senderEmail.isBlank()) ? senderEmail : "noreply@finsenstore.com";
                    message.setFrom(from);
                    message.setTo(admin.getEmail());
                    message.setSubject("ALERT: Data " + action + " by " + currentUser.getUserId());
                    
                    String text = String.format(
                        "Hello %s,\n\n" +
                        "This is an automated alert from the Store Management System.\n\n" +
                        "A data modification has occurred:\n" +
                        "- Location: %s\n" +
                        "- User Name: %s\n" +
                        "- User Role: %s\n" +
                        "- Action Taken: %s\n" +
                        "- Date & Time: %s\n" +
                        "- User ID: %s\n\n" +
                        "Data Details:\n%s\n\n" +
                        "Regards,\nSystem Administrator",
                        admin.getFullName(),
                        locationName,
                        currentUser.getFullName(),
                        currentUser.getRole().name(),
                        action,
                        LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")),
                        currentUser.getUserId(),
                        dataDetails
                    );
                    
                    message.setText(text);
                    
                    if (mailSender != null && senderEmail != null && !senderEmail.trim().isEmpty()) {
                        mailSender.send(message);
                        System.out.println("Audit email sent to " + admin.getEmail());
                    } else {
                        System.out.println("📧 SIMULATED AUDIT EMAIL TO " + admin.getEmail() + " :\n" + text);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to send audit email: " + e.getMessage());
        }
    }

    public boolean sendUserCredentialsEmail(User user, String plainPassword, String actionType) {
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            return false;
        }

        try {
            String stateName = user.getLocation() != null ? user.getLocation().getStateName() : "All States (Global)";
            String siteName = user.getLocation() != null ? user.getLocation().getSiteName() : "All Sites (Global)";
            String roleTitle = user.getRole() == Role.SUPER_ADMIN 
                ? "Super Admin (Full Access)" 
                : (user.getRole() == Role.STORE_INCHARGE ? "Store Incharge (Add/Edit Entries)" : "Viewer (Only View)");
            String loginTypeOption = user.getRole() == Role.SUPER_ADMIN 
                ? "Admin Login" 
                : (user.getRole() == Role.STORE_INCHARGE ? "Store Incharge Login" : "User Login (View Only)");

            String recipientName = user.getFullName() != null && !user.getFullName().isBlank() ? user.getFullName() : user.getUserId();
            String pwdToDisplay = plainPassword != null && !plainPassword.isBlank() ? plainPassword : user.getVisiblePassword();

            String plainText = String.format(
                "Hello %s,\n\n" +
                "Your account login credentials have been %s for Finsen Store Inventory System.\n\n" +
                "====================================================\n" +
                "OFFICIAL LOGIN CREDENTIALS:\n" +
                "====================================================\n" +
                "🌐 Website URL: https://finsenstore.com/login\n" +
                "👤 User ID: %s\n" +
                "🔑 Password: %s\n" +
                "🛡️ Role: %s\n" +
                "📍 Assigned State: %s\n" +
                "🏢 Assigned Site: %s\n" +
                "====================================================\n\n" +
                "HOW TO LOGIN (STEP-BY-STEP):\n" +
                "1. Open https://finsenstore.com/login in your browser.\n" +
                "2. Under 'State (Location)', select: %s\n" +
                "3. Under 'Site Name', enter: %s (Exact spelling required, spelling mistake will cause login failure)\n" +
                "4. Under 'Login Type', select: %s\n" +
                "5. Enter your User ID: %s\n" +
                "6. Enter your Password: %s\n" +
                "7. Click 'Sign In'.\n\n" +
                "Please keep your credentials safe and do not share them.\n\n" +
                "Regards,\n" +
                "Finsen Store Administration\n" +
                "Finsen Ritter Limited",
                recipientName,
                actionType,
                user.getUserId(),
                pwdToDisplay,
                roleTitle,
                stateName,
                siteName,
                stateName,
                siteName,
                loginTypeOption,
                user.getUserId(),
                pwdToDisplay
            );

            String htmlText = String.format(
                "<!DOCTYPE html>" +
                "<html><head><meta charset='UTF-8'></head>" +
                "<body style='font-family: Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b;'>" +
                "<div style='max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08);'>" +
                "  <div style='background: linear-gradient(135deg, #0B4F6C 0%%, #01BAEF 100%%); padding: 25px; text-align: center; color: #ffffff;'>" +
                "    <h1 style='margin: 0; font-size: 24px; font-weight: bold;'>FINSEN RITTER LIMITED</h1>" +
                "    <p style='margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;'>Enterprise Store & Inventory Management System</p>" +
                "  </div>" +
                "  <div style='padding: 30px;'>" +
                "    <h2 style='color: #0B4F6C; margin-top: 0;'>Hello %s,</h2>" +
                "    <p style='font-size: 15px; line-height: 1.5;'>Your account details have been <strong>%s</strong>. Here are your official login credentials to access the Finsen Store portal:</p>" +
                "    <div style='background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;'>" +
                "      <table style='width: 100%%; font-size: 15px; border-collapse: collapse;'>" +
                "        <tr><td style='padding: 6px 0; color: #64748b; font-weight: bold; width: 140px;'>🌐 Portal URL:</td><td style='padding: 6px 0;'><a href='https://finsenstore.com/login' style='color: #01BAEF; font-weight: bold;'>https://finsenstore.com/login</a></td></tr>" +
                "        <tr><td style='padding: 6px 0; color: #64748b; font-weight: bold;'>👤 User ID:</td><td style='padding: 6px 0; font-weight: bold; color: #0f172a;'>%s</td></tr>" +
                "        <tr><td style='padding: 6px 0; color: #64748b; font-weight: bold;'>🔑 Password:</td><td style='padding: 6px 0; font-weight: bold; color: #0B4F6C;'>%s</td></tr>" +
                "        <tr><td style='padding: 6px 0; color: #64748b; font-weight: bold;'>🛡️ Account Role:</td><td style='padding: 6px 0;'><span style='background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 4px; font-weight: bold;'>%s</span></td></tr>" +
                "        <tr><td style='padding: 6px 0; color: #64748b; font-weight: bold;'>📍 State:</td><td style='padding: 6px 0; font-weight: 500;'>%s</td></tr>" +
                "        <tr><td style='padding: 6px 0; color: #64748b; font-weight: bold;'>🏢 Site Name:</td><td style='padding: 6px 0; font-weight: bold; color: #0284c7;'>%s</td></tr>" +
                "      </table>" +
                "    </div>" +
                "    <div style='background: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; border-radius: 4px; margin-bottom: 25px;'>" +
                "      <h4 style='margin: 0 0 10px 0; color: #166534;'>📋 HOW TO LOGIN (STEP-BY-STEP):</h4>" +
                "      <ol style='margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6; color: #15803d;'>" +
                "        <li>Open <a href='https://finsenstore.com/login' target='_blank'><strong>https://finsenstore.com/login</strong></a></li>" +
                "        <li>Under <strong>'State (Location)'</strong>, select: <strong>%s</strong></li>" +
                "        <li>Under <strong>'Site Name'</strong>, enter: <strong>%s</strong> (Exact spelling zaroori hai)</li>" +
                "        <li>Under <strong>'Login Type'</strong>, select: <strong>%s</strong></li>" +
                "        <li>Enter your <strong>User ID</strong> and <strong>Password</strong></li>" +
                "        <li>Click <strong>Sign In</strong></li>" +
                "      </ol>" +
                "    </div>" +
                "    <div style='text-align: center; margin-top: 25px;'>" +
                "      <a href='https://finsenstore.com/login' style='background: #0B4F6C; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;'>Log In Now</a>" +
                "    </div>" +
                "    <p style='margin-top: 30px; font-size: 13px; color: #94a3b8;'>Please do not share these credentials with unauthorized persons. If you have questions, contact the System Administrator.</p>" +
                "  </div>" +
                "  <div style='background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 15px; text-align: center; font-size: 12px; color: #64748b;'>" +
                "    © Finsen Ritter Limited | Indore, MP | Finsen Store Management System" +
                "  </div>" +
                "</div>" +
                "</body></html>",
                recipientName,
                actionType,
                user.getUserId(),
                pwdToDisplay,
                roleTitle,
                stateName,
                siteName,
                stateName,
                loginTypeOption
            );

            if (mailSender != null && senderEmail != null && !senderEmail.trim().isEmpty()) {
                try {
                    MimeMessage mimeMessage = mailSender.createMimeMessage();
                    MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
                    helper.setFrom(senderEmail, "Finsen Store System");
                    helper.setTo(user.getEmail());
                    helper.setSubject("Finsen Store - Login Credentials for " + user.getRole().name() + " (" + siteName + ")");
                    helper.setText(plainText, htmlText);
                    mailSender.send(mimeMessage);
                    System.out.println("✅ Real email sent successfully to " + user.getEmail() + " via SMTP");
                    return true;
                } catch (Exception ex) {
                    System.err.println("⚠️ SMTP send failed, falling back to simple message: " + ex.getMessage());
                    SimpleMailMessage simpleMsg = new SimpleMailMessage();
                    simpleMsg.setFrom(senderEmail);
                    simpleMsg.setTo(user.getEmail());
                    simpleMsg.setSubject("Finsen Store - Login Credentials for " + user.getRole().name() + " (" + siteName + ")");
                    simpleMsg.setText(plainText);
                    mailSender.send(simpleMsg);
                    System.out.println("✅ Fallback email sent to " + user.getEmail());
                    return true;
                }
            } else {
                System.out.println("📧 SIMULATED CREDENTIALS EMAIL TO " + user.getEmail() + " :\n" + plainText);
                return false;
            }
        } catch (Exception e) {
            System.err.println("❌ Failed to send user credentials email: " + e.getMessage());
            return false;
        }
    }

    public boolean sendTestEmail(String toEmail) {
        if (toEmail == null || toEmail.isBlank() || mailSender == null) {
            return false;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            String from = (senderEmail != null && !senderEmail.isBlank()) ? senderEmail : "noreply@finsenstore.com";
            msg.setFrom(from);
            msg.setTo(toEmail);
            msg.setSubject("Test Email from Finsen Store Management System");
            msg.setText("Hello,\n\nThis is a test email from Finsen Store verifying that email sending is working properly!\n\nWebsite: https://finsenstore.com\n\nRegards,\nFinsen Ritter Administration");
            mailSender.send(msg);
            System.out.println("✅ Test email sent successfully to " + toEmail);
            return true;
        } catch (Exception e) {
            System.err.println("❌ Test email failed: " + e.getMessage());
            return false;
        }
    }
}
