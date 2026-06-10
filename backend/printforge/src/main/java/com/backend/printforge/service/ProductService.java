package com.backend.printforge.service;

import com.backend.printforge.model.Product;

import java.util.Arrays;
import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class ProductService {

    List<Product> products=Arrays.asList(
     new Product(101,"Iphone",50000),
     new Product(102,"Canon",38342));

    public List<Product>getProducts(){
        return products;

    }

}
