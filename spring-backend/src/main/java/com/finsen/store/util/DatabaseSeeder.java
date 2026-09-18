package com.finsen.store.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finsen.store.entity.*;
import com.finsen.store.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Arrays;

import org.springframework.beans.factory.annotation.Autowired;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final LocationRepository locationRepository;
    private final MaterialRepository materialRepository;
    private final StockEntryRepository stockEntryRepository;
    private final SupportContactRepository supportContactRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.finsen.store.service.StockEntryService stockEntryService;

    @Autowired
    public DatabaseSeeder(UserRepository userRepository, LocationRepository locationRepository, MaterialRepository materialRepository, StockEntryRepository stockEntryRepository, SupportContactRepository supportContactRepository, PasswordEncoder passwordEncoder, com.finsen.store.service.StockEntryService stockEntryService) {
        this.userRepository = userRepository;
        this.locationRepository = locationRepository;
        this.materialRepository = materialRepository;
        this.stockEntryRepository = stockEntryRepository;
        this.supportContactRepository = supportContactRepository;
        this.passwordEncoder = passwordEncoder;
        this.stockEntryService = stockEntryService;
    }

    @Override
    public void run(String... args) {
        try {
            if (locationRepository.count() < 28) {
            // Add Locations (28 States of India)
            String[] indianStates = {
                "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
                "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
                "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
                "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
            };
            
            Location hyd = null;
            Location ap = null;
            for (String stateName : indianStates) {
                Location loc = locationRepository.save(new Location(null, stateName, stateName.substring(0, Math.min(3, stateName.length())).toUpperCase(), stateName + " Site", true));
                if (stateName.equals("Telangana")) hyd = loc; // For fallback dummy data
                if (stateName.equals("Andhra Pradesh")) ap = loc;
            }
            if (hyd == null) hyd = locationRepository.findAll().get(0);
            if (ap == null) ap = hyd;

            // Add Admin User
            userRepository.save(new User(null, "admin", "admin@finsen.com", passwordEncoder.encode("admin123"), "admin123", "Super Admin", Role.SUPER_ADMIN, null, true));
            userRepository.save(new User(null, "storeadmin", "store@finsen.com", passwordEncoder.encode("store123"), "store123", "Store Incharge", Role.STORE_INCHARGE, hyd, true));

            // Add users from user's sketch
            userRepository.save(new User(null, "@finsen-admin", "admin2@finsen.com", passwordEncoder.encode("7Finsenxyz#"), "7Finsenxyz#", "Finsen Admin", Role.SUPER_ADMIN, null, true));
            userRepository.save(new User(null, "@finsen-user", "user@finsen.com", passwordEncoder.encode("7Userzyx#"), "7Userzyx#", "Finsen User", Role.USER, hyd, true));

            Location raj = locationRepository.findAll().stream().filter(l -> l.getName().equalsIgnoreCase("Rajasthan")).findFirst().orElse(ap);

            // Add specific users for Andhra Pradesh & Rajasthan
            userRepository.save(new User(null, "arunish@123", "arunish@finsen.com", passwordEncoder.encode("arunish@123"), "arunish@123", "Arunish Yadav", Role.USER, ap, true));
            userRepository.save(new User(null, "arunish@321", "arunish321@finsen.com", passwordEncoder.encode("arunish@321"), "arunish@321", "Arunish Supervisor", Role.STORE_INCHARGE, ap, true));
            userRepository.save(new User(null, "Narayan@321", "narayan@finsen.com", passwordEncoder.encode("Narayan@321"), "Narayan@321", "Narayan Incharge", Role.STORE_INCHARGE, raj, true));
            userRepository.save(new User(null, "narayan@321", "narayan2@finsen.com", passwordEncoder.encode("Narayan@321"), "Narayan@321", "Narayan Incharge", Role.STORE_INCHARGE, raj, true));
        }

        // Ensure Real 175 Materials and 352 Entries are loaded for Andhra Pradesh
        Location apLocation = locationRepository.findAll().stream()
                .filter(l -> l.getName().equalsIgnoreCase("Andhra Pradesh"))
                .findFirst().orElse(null);

        if (apLocation != null && stockEntryRepository.count() < 200) {
            try {
                InputStream is = getClass().getResourceAsStream("/real_352_entries.json");
                if (is != null) {
                    ObjectMapper mapper = new ObjectMapper();
                    JsonNode root = mapper.readTree(is);
                    JsonNode materialsNode = root.get("materials");
                    JsonNode entriesNode = root.get("entries");

                    Map<String, Material> materialMap = new HashMap<>();

                    if (materialsNode != null && materialsNode.isArray()) {
                        for (JsonNode mNode : materialsNode) {
                            String code = mNode.get("itemCode").asText();
                            String name = mNode.get("name").asText();
                            String cat = mNode.get("category").asText();
                            String unit = mNode.get("unit").asText();

                            Material mat = materialRepository.save(new Material(null, code, name, cat, unit, 5.0, apLocation, true));
                            materialMap.put(code, mat);
                        }
                    }

                    DateTimeFormatter dtf1 = DateTimeFormatter.ofPattern("M/d/yyyy");
                    DateTimeFormatter dtf2 = DateTimeFormatter.ofPattern("yyyy-MM-dd");

                    if (entriesNode != null && entriesNode.isArray()) {
                        for (JsonNode eNode : entriesNode) {
                            String code = eNode.get("itemCode").asText();
                            Material mat = materialMap.get(code);
                            if (mat == null) {
                                mat = materialRepository.save(new Material(null, code, eNode.get("materialName").asText(), "Hardware", "Nos", 5.0, apLocation, true));
                                materialMap.put(code, mat);
                            }

                            double inQty = eNode.has("inQty") ? eNode.get("inQty").asDouble() : 0.0;
                            double outQty = eNode.has("outQty") ? eNode.get("outQty").asDouble() : 0.0;
                            double currStock = eNode.has("currentStock") ? eNode.get("currentStock").asDouble() : (inQty - outQty);

                            LocalDate arrDate = parseJsonDate(eNode.get("arrDate"), dtf1, dtf2);
                            LocalDate outDate = parseJsonDate(eNode.get("outDate"), dtf1, dtf2);

                            String broughtBy = eNode.has("broughtBy") && !eNode.get("broughtBy").isNull() ? eNode.get("broughtBy").asText() : "NA";
                            String issuedBy = eNode.has("issuedBy") && !eNode.get("issuedBy").isNull() ? eNode.get("issuedBy").asText() : "NA";

                            StockEntry entry = new StockEntry(
                                    null,
                                    "ENTRY-" + eNode.get("entryNo").asInt(),
                                    mat,
                                    inQty,
                                    arrDate,
                                    LocalTime.of(10, 0),
                                    currStock > 0 ? "YES" : "NO",
                                    outQty,
                                    outDate,
                                    issuedBy,
                                    "Store Incharge",
                                    currStock,
                                    "NA", "NA", "NA",
                                    broughtBy,
                                    apLocation
                            );
                            stockEntryRepository.save(entry);
                        }
                    }
                    System.out.println("✅ Real 175 Materials and 352 Stock Entries for Andhra Pradesh loaded successfully!");
                }
            } catch (Exception e) {
                System.err.println("Error seeding 352 real entries: " + e.getMessage());
                e.printStackTrace();
            }
        }

        // Ensure Rajasthan Location has initial materials & stock entries
        Location rajLocation = locationRepository.findAll().stream()
                .filter(l -> l.getName().equalsIgnoreCase("Rajasthan"))
                .findFirst().orElse(null);

        if (rajLocation != null && materialRepository.findByLocationId(rajLocation.getId()).isEmpty()) {
            try {
                Material m1 = materialRepository.save(new Material(null, "RAJ-CEMENT", "Ultratech Cement 50kg Bag", "Civil", "Bags", 10.0, rajLocation, true));
                Material m2 = materialRepository.save(new Material(null, "RAJ-WIRE", "Winding Wire 1.2 mm", "Electrical", "Kg", 5.0, rajLocation, true));
                Material m3 = materialRepository.save(new Material(null, "RAJ-PIPE", "HDPE Pipe 4 inch", "Plumbing", "Mtr", 10.0, rajLocation, true));
                Material m4 = materialRepository.save(new Material(null, "RAJ-NOJAL", "Cutting Nojal 2\"", "Civil", "Nos", 5.0, rajLocation, true));

                stockEntryRepository.save(new StockEntry(null, "RAJ-ENTRY-001", m1, 500.0, LocalDate.of(2026, 6, 10), LocalTime.of(10, 0), "YES", 120.0, LocalDate.of(2026, 6, 15), "Narayan Store Incharge", "Store Incharge", 380.0, "NA", "NA", "NA", "Supplier Rajasthan", rajLocation));
                stockEntryRepository.save(new StockEntry(null, "RAJ-ENTRY-002", m2, 100.0, LocalDate.of(2026, 6, 12), LocalTime.of(10, 0), "YES", 25.0, LocalDate.of(2026, 6, 20), "Narayan Store Incharge", "Store Incharge", 75.0, "NA", "NA", "NA", "Supplier Rajasthan", rajLocation));
                stockEntryRepository.save(new StockEntry(null, "RAJ-ENTRY-003", m3, 200.0, LocalDate.of(2026, 7, 5), LocalTime.of(10, 0), "YES", 40.0, LocalDate.of(2026, 7, 10), "Narayan Store Incharge", "Store Incharge", 160.0, "NA", "NA", "NA", "Supplier Rajasthan", rajLocation));
                stockEntryRepository.save(new StockEntry(null, "RAJ-ENTRY-004", m4, 50.0, LocalDate.of(2026, 7, 8), LocalTime.of(10, 0), "YES", 10.0, LocalDate.of(2026, 7, 12), "Narayan Store Incharge", "Store Incharge", 40.0, "NA", "NA", "NA", "Supplier Rajasthan", rajLocation));
                System.out.println("✅ Initial Materials & Stock Entries for Rajasthan loaded successfully!");
            } catch (Exception e) {
                System.err.println("Error seeding Rajasthan data: " + e.getMessage());
            }
        }

        // Always ensure Master Super Admin accounts exist in Database with SUPER_ADMIN role (ALL STATES)
        try {
            userRepository.findByUserId("@finsen-admin").ifPresentOrElse(u -> {
                u.setRole(Role.SUPER_ADMIN);
                u.setLocation(null);
                userRepository.save(u);
            }, () -> {
                if (userRepository.findByEmail("admin2@finsen.com").isEmpty()) {
                    userRepository.save(new User(null, "@finsen-admin", "admin2@finsen.com", passwordEncoder.encode("7Finsenxyz#"), "7Finsenxyz#", "Finsen Admin", Role.SUPER_ADMIN, null, true));
                }
            });
        } catch (Exception e) {
            System.err.println("Seeding @finsen-admin warning: " + e.getMessage());
        }

        try {
            userRepository.findByUserId("admin").ifPresentOrElse(u -> {
                u.setRole(Role.SUPER_ADMIN);
                u.setLocation(null);
                userRepository.save(u);
            }, () -> {
                if (userRepository.findByEmail("admin@finsen.com").isEmpty()) {
                    userRepository.save(new User(null, "admin", "admin@finsen.com", passwordEncoder.encode("admin123"), "admin123", "Super Admin", Role.SUPER_ADMIN, null, true));
                }
            });
        } catch (Exception e) {
            System.err.println("Seeding admin warning: " + e.getMessage());
        }

        // Always update Narayan@321 to STORE_INCHARGE assigned to Rajasthan
        try {
            Location raj = locationRepository.findAll().stream().filter(l -> l.getName().equalsIgnoreCase("Rajasthan")).findFirst().orElse(null);
            if (raj != null) {
                userRepository.findByUserId("Narayan@321").ifPresentOrElse(u -> {
                    u.setRole(Role.STORE_INCHARGE);
                    u.setLocation(raj);
                    userRepository.save(u);
                }, () -> {
                    if (userRepository.findByEmail("narayan@finsen.com").isEmpty()) {
                        userRepository.save(new User(null, "Narayan@321", "narayan@finsen.com", passwordEncoder.encode("Narayan@321"), "Narayan@321", "Narayan Incharge", Role.STORE_INCHARGE, raj, true));
                    }
                });

                userRepository.findByUserId("narayan@321").ifPresentOrElse(u -> {
                    u.setRole(Role.STORE_INCHARGE);
                    u.setLocation(raj);
                    userRepository.save(u);
                }, () -> {
                    if (userRepository.findByEmail("narayan2@finsen.com").isEmpty()) {
                        userRepository.save(new User(null, "narayan@321", "narayan2@finsen.com", passwordEncoder.encode("Narayan@321"), "Narayan@321", "Narayan Incharge", Role.STORE_INCHARGE, raj, true));
                    }
                });
            }
        } catch (Exception e) {
            System.err.println("Seeding Narayan warning: " + e.getMessage());
        }

        // Clean up any old auto-provisioned test user accounts in database
        List<String> validUserIds = List.of("@finsen-admin", "admin", "Narayan@321", "narayan@321", "arunish@321", "arunish@123", "@finsen-user", "storeadmin", "onlyview@123");
        userRepository.findAll().stream()
                .filter(u -> u.getUserId() != null && !validUserIds.contains(u.getUserId()))
                .forEach(u -> {
                    try {
                        userRepository.delete(u);
                    } catch (Exception e) {
                        u.setActive(false);
                        userRepository.save(u);
                    }
                });

        // Always ensure Support Contacts exist
        if (supportContactRepository.count() == 0) {
            supportContactRepository.save(new SupportContact(null, "IT Engineer", "Arunish Yadav", "7858937433", "arunishyadav121@gmail.com"));
            supportContactRepository.save(new SupportContact(null, "Account Head", "Sachin Sir", "9630493830", ""));
            System.out.println("Support Contacts Seeded Successfully!");
        }

        // Always run full stock recalculation on startup/seeding
        try {
            stockEntryService.recalculateAllStockEntries();
        } catch (Exception e) {
            System.err.println("Seeder stock recalculation warning: " + e.getMessage());
        }
        } catch (Exception e) {
            System.err.println("DatabaseSeeder exception caught safely: " + e.getMessage());
        }
    }

    private LocalDate parseJsonDate(JsonNode node, DateTimeFormatter dtf1, DateTimeFormatter dtf2) {
        if (node == null || node.isNull() || node.asText().isBlank() || node.asText().equals("-")) {
            return null;
        }
        String txt = node.asText().trim();
        try {
            return LocalDate.parse(txt, dtf1);
        } catch (Exception e1) {
            try {
                return LocalDate.parse(txt, dtf2);
            } catch (Exception e2) {
                return null;
            }
        }
    }
}
