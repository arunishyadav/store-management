package com.finsen.store;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FinsenStoreApplication {

	public static void main(String[] args) {
		String envPort = System.getenv("PORT");
		if (envPort != null && !envPort.trim().isEmpty()) {
			System.setProperty("server.port", envPort.trim());
		} else {
			System.setProperty("server.port", "8080");
		}

		String dbUrl = System.getenv("SPRING_DATASOURCE_URL");
		if (dbUrl != null && !dbUrl.trim().isEmpty()) {
			System.setProperty("spring.datasource.url", dbUrl.trim());
			String dbUser = System.getenv("SPRING_DATASOURCE_USERNAME");
			if (dbUser != null && !dbUser.trim().isEmpty()) {
				System.setProperty("spring.datasource.username", dbUser.trim());
			}
			String dbPass = System.getenv("SPRING_DATASOURCE_PASSWORD");
			if (dbPass != null && !dbPass.trim().isEmpty()) {
				System.setProperty("spring.datasource.password", dbPass.trim());
			}

			if (dbUrl.startsWith("jdbc:mysql:")) {
				System.setProperty("spring.datasource.driver-class-name", "com.mysql.cj.jdbc.Driver");
				System.setProperty("spring.jpa.database-platform", "org.hibernate.dialect.MySQLDialect");
			} else if (dbUrl.startsWith("jdbc:postgresql:")) {
				System.setProperty("spring.datasource.driver-class-name", "org.postgresql.Driver");
				System.setProperty("spring.jpa.database-platform", "org.hibernate.dialect.PostgreSQLDialect");
			}
		}

		SpringApplication.run(FinsenStoreApplication.class, args);
	}

}
