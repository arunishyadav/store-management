package com.finsen.store.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Controller to handle client-side React routes on page refresh.
 * Forwards requests like /entry-book, /materials, /mis-report, /users, /help, /login
 * to index.html so React Router renders the requested page without 404 error.
 */
@Controller
public class SpaController {

    @GetMapping(value = {
        "/entry-book",
        "/materials",
        "/mis-report",
        "/users",
        "/help",
        "/login"
    })
    public String forwardClientRoutes() {
        return "forward:/index.html";
    }
}
