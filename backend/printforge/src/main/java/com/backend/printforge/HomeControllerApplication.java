package com.backend.printforge;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HomeControllerApplication{

    @RequestMapping("/")    
    public String greet(){
        return "Wazaaa!";
    }
    
    @RequestMapping("/about")
    public String about(){
        return "I'm Him";
    }

}