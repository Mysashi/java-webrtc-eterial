package eterial_vc.eterial.controller;

import java.util.ArrayList;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

import lombok.extern.slf4j.Slf4j;

@Controller
@Slf4j
public class SocketController {


    private ArrayList<String> users = new ArrayList();

    @Autowired
    SimpMessagingTemplate simpMessagingTemplate;


    @GetMapping("/socket")
    public String getSocketTemplate() {
        return "index.html";
    }

    @MessageMapping("/call")
    public void call(String call) {
        JSONObject callObj = new JSONObject(call);
        String callFrom = (String)callObj.get(("callFrom"));
        users.add(callFrom);
        log.debug(callFrom);
        simpMessagingTemplate.convertAndSend("/topic/call",  callFrom);
    }

    @MessageMapping("/candidate")
    public void Candidate(String candidate){
        System.out.println("Candidate came");
        JSONObject jsonObject = new JSONObject(candidate);
        System.out.println(jsonObject.get("toUser"));
        System.out.println(jsonObject.get("fromUser"));
        System.out.println(jsonObject.get("candidate"));
        simpMessagingTemplate.convertAndSendToUser(jsonObject.getString("toUser"),"/topic/candidate",candidate);
        System.out.println("Candidate Sent");


    }
    @MessageMapping("/testServer")
    @SendTo("/topic/testServer")
    public String testServer(String Test){
        System.out.println("Testing Server");
        return Test;
    }

    @MessageMapping("/offer") 
    public void offer(String offer) {
        System.out.println("Offer Came");
        JSONObject jsonObject = new JSONObject(offer);
        simpMessagingTemplate.convertAndSend("/topic/offer",offer);
        System.out.println("Offer were sent");
    }

    @MessageMapping("/answer")
    public void Answer(String answer){
        System.out.println("Answer came");
        simpMessagingTemplate.convertAndSend("/topic/answer",answer);
        System.out.println("Answer Sent");
    }


}
