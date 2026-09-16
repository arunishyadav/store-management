package com.finsen.store.util;

import com.finsen.store.entity.Material;
import com.finsen.store.repository.MaterialRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class CategoryCleanupRunner implements CommandLineRunner {

    @Autowired
    private MaterialRepository materialRepository;

    @Override
    public void run(String... args) throws Exception {
        List<Material> materials = materialRepository.findAll();
        int updatedCount = 0;
        
        for (Material mat : materials) {
            String cat = mat.getCategory();
            if (cat == null) continue;
            
            String normalized = cat.trim().toLowerCase();
            String newCat = cat;
            
            if (normalized.equals("machanical") || normalized.equals("mechanical")) {
                newCat = "Mechanical";
            } else if (normalized.equals("civil")) {
                newCat = "Civil";
            } else if (normalized.equals("electrical") || normalized.equals("electricity")) {
                newCat = "Electrical";
            } else if (normalized.equals("fabrication")) {
                newCat = "Fabrication";
            } else if (normalized.equals("hardware")) {
                newCat = "Hardware";
            }
            
            if (!cat.equals(newCat)) {
                mat.setCategory(newCat);
                materialRepository.save(mat);
                updatedCount++;
            }
        }
        
        System.out.println("CategoryCleanupRunner: Cleaned up " + updatedCount + " material categories.");
    }
}
