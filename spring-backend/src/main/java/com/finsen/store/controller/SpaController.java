package com.finsen.store.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * Controller to handle SPA (Single Page Application) routing.
 * Forwards non-API requests (like /entry-book, /materials, /mis-report, /users, /help, /login)
 * to index.html so React Router handles them smoothly on page refresh without showing 404 Whitelabel Error Page.
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
    public String forwardKnownRoutes() {
        return "forward:/index.html";
    }

    @RequestMapping(value = "/{path:[^\\.]*}")
    public String forwardOtherSpaRoutes() {
        return "forward:/index.html";
    }
}
