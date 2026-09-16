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
}
