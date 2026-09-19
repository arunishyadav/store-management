package com.finsen.store.service;

import com.finsen.store.entity.Material;
import com.finsen.store.entity.StockEntry;
import com.finsen.store.entity.TrashItem;
import com.finsen.store.repository.MaterialRepository;
import com.finsen.store.repository.StockEntryRepository;
import com.finsen.store.repository.TrashItemRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class TrashService {

    private static final Logger logger = LoggerFactory.getLogger(TrashService.class);

    private final TrashItemRepository trashItemRepository;
    private final StockEntryRepository stockEntryRepository;
    private final MaterialRepository materialRepository;
    private final StockEntryService stockEntryService;
    private final SimpMessagingTemplate messagingTemplate;

    @Autowired
    public TrashService(TrashItemRepository trashItemRepository,
                        StockEntryRepository stockEntryRepository,
                        MaterialRepository materialRepository,
                        StockEntryService stockEntryService,
                        SimpMessagingTemplate messagingTemplate) {
        this.trashItemRepository = trashItemRepository;
        this.stockEntryRepository = stockEntryRepository;
        this.materialRepository = materialRepository;
        this.stockEntryService = stockEntryService;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional(readOnly = true)
    public List<TrashItem> getTrashItems(UUID locationId) {
        if (locationId != null) {
            return trashItemRepository.findByLocationIdOrderByDeletedAtDesc(locationId);
        }
        return trashItemRepository.findAllOrderByDeletedAtDesc();
    }

    @Transactional
    public TrashItem restoreItem(UUID id) {
        TrashItem item = trashItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Trash item not found: " + id));

        logger.info("Restoring trash item: id={}, module={}, origId={}", item.getId(), item.getSourceModule(), item.getOriginalRecordId());

        if ("ENTRY_BOOK".equalsIgnoreCase(item.getSourceModule())) {
            try {
                UUID entryId = UUID.fromString(item.getOriginalRecordId());
                StockEntry entry = stockEntryRepository.findById(entryId).orElse(null);
                if (entry != null) {
                    entry.setDeleted(false);
                    entry.setDeletedAt(null);
                    entry.setDeletedBy(null);
                    stockEntryRepository.save(entry);

                    if (entry.getMaterial() != null) {
                        UUID locId = entry.getLocation() != null ? entry.getLocation().getId() : null;
                        stockEntryService.recalculateMaterialStockBalance(entry.getMaterial().getId(), locId);
                    }
                } else {
                    logger.warn("Original StockEntry {} not found during restore", entryId);
                }
            } catch (Exception e) {
                logger.error("Error restoring ENTRY_BOOK item {}: {}", id, e.getMessage(), e);
                throw new RuntimeException("Failed to restore entry: " + e.getMessage());
            }
        } else if ("MATERIAL".equalsIgnoreCase(item.getSourceModule())) {
            try {
                UUID matId = UUID.fromString(item.getOriginalRecordId());
                Material material = materialRepository.findById(matId).orElse(null);
                if (material != null) {
                    material.setDeleted(false);
                    material.setActive(true);
                    material.setDeletedAt(null);
                    material.setDeletedBy(null);
                    materialRepository.save(material);
                } else {
                    logger.warn("Original Material {} not found during restore", matId);
                }
            } catch (Exception e) {
                logger.error("Error restoring MATERIAL item {}: {}", id, e.getMessage(), e);
                throw new RuntimeException("Failed to restore material: " + e.getMessage());
            }
        }

        trashItemRepository.delete(item);

        if (item.getLocation() != null) {
            try {
                messagingTemplate.convertAndSend("/topic/location/" + item.getLocation().getId(), "STOCK_UPDATED");
            } catch (Exception ignored) {}
        }

        return item;
    }

    @Transactional
    public List<UUID> restoreBatch(List<UUID> ids) {
        List<UUID> restored = new ArrayList<>();
        if (ids == null || ids.isEmpty()) return restored;

        for (UUID id : ids) {
            try {
                restoreItem(id);
                restored.add(id);
            } catch (Exception e) {
                logger.error("Failed to restore item in batch {}: {}", id, e.getMessage());
            }
        }
        return restored;
    }

    @Transactional
    public void permanentDeleteItem(UUID id) {
        TrashItem item = trashItemRepository.findById(id).orElse(null);
        if (item == null) return;

        logger.info("Permanently deleting trash item: id={}, module={}, origId={}", item.getId(), item.getSourceModule(), item.getOriginalRecordId());

        if ("ENTRY_BOOK".equalsIgnoreCase(item.getSourceModule())) {
            try {
                if (item.getOriginalRecordId() != null) {
                    UUID entryId = UUID.fromString(item.getOriginalRecordId());
                    stockEntryRepository.findById(entryId).ifPresent(stockEntryRepository::delete);
                }
            } catch (Exception e) {
                logger.error("Failed to delete underlying StockEntry {}: {}", item.getOriginalRecordId(), e.getMessage());
            }
        } else if ("MATERIAL".equalsIgnoreCase(item.getSourceModule())) {
            try {
                if (item.getOriginalRecordId() != null) {
                    UUID matId = UUID.fromString(item.getOriginalRecordId());
                    Material material = materialRepository.findById(matId).orElse(null);
                    if (material != null) {
                        List<StockEntry> linkedEntries = stockEntryRepository.findByMaterialId(matId);
                        if (linkedEntries == null || linkedEntries.isEmpty()) {
                            materialRepository.delete(material);
                        } else {
                            // Linked stock entries exist in the ledger.
                            // To preserve referential integrity and prevent deleting historical stock entries,
                            // keep the material permanently soft-deleted in DB while permanently removing from Trash.
                            material.setDeleted(true);
                            material.setActive(false);
                            materialRepository.save(material);
                        }
                    }
                }
            } catch (Exception e) {
                logger.error("Failed to delete underlying Material {}: {}", item.getOriginalRecordId(), e.getMessage());
            }
        }

        trashItemRepository.delete(item);
    }

    @Transactional
    public void permanentDeleteBatch(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) return;
        for (UUID id : ids) {
            try {
                permanentDeleteItem(id);
            } catch (Exception e) {
                logger.error("Failed to permanently delete item in batch {}: {}", id, e.getMessage());
            }
        }
    }
}
