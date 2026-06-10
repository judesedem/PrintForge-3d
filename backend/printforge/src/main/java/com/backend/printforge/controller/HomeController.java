package com.backend.printforge.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HomeController{

    @RequestMapping("/")    
    public String greet(){
        return "Testing testing... things are getting interesting!";
    }
    
    @RequestMapping("/about")
    public String about(){
        return "I'm a Hero";
    }

}