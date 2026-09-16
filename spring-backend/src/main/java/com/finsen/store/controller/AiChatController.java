package com.finsen.store.controller;

import com.finsen.store.dto.ChatRequest;
import com.finsen.store.dto.ChatResponse;
import com.finsen.store.dto.OllamaStatusResponse;
import com.finsen.store.service.AiChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ai")
@CrossOrigin(origins = "*")
public class AiChatController {

    @Autowired
    private AiChatService aiChatService;

    @GetMapping("/status")
    public ResponseEntity<OllamaStatusResponse> getOllamaStatus() {
        return ResponseEntity.ok(aiChatService.checkOllamaStatus());
    }

    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(@RequestBody ChatRequest request) {
        return ResponseEntity.ok(aiChatService.processChat(request));
    }
}
