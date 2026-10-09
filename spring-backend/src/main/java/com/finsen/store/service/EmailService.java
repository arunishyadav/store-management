package com.finsen.store.service;

import com.finsen.store.entity.Role;
import com.finsen.store.entity.User;
import com.finsen.store.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
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
            // Find all Super Admins
            List<User> admins = userRepository.findByRole(Role.SUPER_ADMIN);
            
            for (User admin : admins) {
                if (admin.getEmail() != null && !admin.getEmail().isBlank()) {
                    SimpleMailMessage message = new SimpleMailMessage();
                    
                    if (senderEmail != null && !senderEmail.contains("YOUR_EMAIL")) {
                        message.setFrom(senderEmail);
                    }
                    
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
                    
                    // Skip actual sending if placeholder is still used or mailSender is null
                    if (mailSender != null && senderEmail != null && !senderEmail.trim().isEmpty() && !senderEmail.contains("YOUR_EMAIL")) {
                        mailSender.send(message);
                        System.out.println("Audit email sent to " + admin.getEmail());
                    } else {
                        System.out.println("SIMULATED EMAIL TO " + admin.getEmail() + " :\n" + text);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to send audit email: " + e.getMessage());
        }
    }

    public void sendUserCredentialsEmail(User user, String plainPassword, String actionType) {
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            return;
        }

        try {
            String stateName = user.getLocation() != null ? user.getLocation().getStateName() : "All States (Global)";
            String siteName = user.getLocation() != null ? user.getLocation().getSiteName() : "All Sites (Global)";
            String roleTitle = user.getRole() == Role.SUPER_ADMIN 
                ? "Super Admin (Full Access)" 
                : (user.getRole() == Role.STORE_INCHARGE ? "Store Incharge (Add/Edit Entries)" : "Viewer (Only View)");

            SimpleMailMessage message = new SimpleMailMessage();
            if (senderEmail != null && !senderEmail.isBlank() && !senderEmail.contains("YOUR_EMAIL")) {
                message.setFrom(senderEmail);
            }
            message.setTo(user.getEmail());
            message.setSubject("Finsen Store - Login Credentials for " + user.getRole().name() + " (" + siteName + ")");

            String text = String.format(
                "Hello %s,\n\n" +
                "Your account login details have been %s for Finsen Store Inventory System.\n\n" +
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
                "HOW TO LOGIN:\n" +
                "1. Open https://finsenstore.com/login\n" +
                "2. Under 'State (Location)', select: %s\n" +
                "3. Under 'Login Type', select: %s\n" +
                "4. Enter your User ID (%s) and Password.\n" +
                "5. Click Sign In.\n\n" +
                "Please keep your credentials safe.\n\n" +
                "Regards,\n" +
                "Finsen Store Administration\n" +
                "Finsen Ritter Limited",
                user.getFullName() != null ? user.getFullName() : user.getUserId(),
                actionType,
                user.getUserId(),
                plainPassword != null ? plainPassword : user.getVisiblePassword(),
                roleTitle,
                stateName,
                siteName,
                stateName,
                user.getRole() == Role.SUPER_ADMIN ? "Admin Login" : (user.getRole() == Role.STORE_INCHARGE ? "Store Incharge Login" : "User Login (View Only)"),
                user.getUserId()
            );

            message.setText(text);

            if (mailSender != null && senderEmail != null && !senderEmail.trim().isEmpty() && !senderEmail.contains("YOUR_EMAIL")) {
                mailSender.send(message);
                System.out.println("✅ User credentials email sent successfully to " + user.getEmail());
            } else {
                System.out.println("📧 SIMULATED CREDENTIALS EMAIL TO " + user.getEmail() + " :\n" + text);
            }
        } catch (Exception e) {
            System.err.println("Failed to send user credentials email: " + e.getMessage());
        }
    }
}
