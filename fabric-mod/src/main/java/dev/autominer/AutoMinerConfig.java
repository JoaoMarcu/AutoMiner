package dev.autominer;

import java.util.*;

public final class AutoMinerConfig {
    public int schemaVersion = 2;
    public List<BlockRule> enabledBlocks = defaults();
    public Movement movement = new Movement();
    public Camera camera = new Camera();
    public Randomness randomness = new Randomness();
    public Mining mining = new Mining();
    public Advanced advanced = new Advanced();
    public record BlockRule(String id, boolean enabled, int priority) {}
    public static final class Movement { public boolean forward=true, sprint=true, sideMovement=false; public double baseSpeed=1; public int lateralRange=3, verticalUp=2, verticalDown=2, searchDistance=6; }
    public static final class Camera { public float yawSpeed=6, pitchSpeed=5, smoothing=.82f, horizontalLimit=75, verticalLimit=60, variation=.7f; }
    public static final class Randomness { public boolean enabled=true; public double amount=.35, targetNoise=.12, timingNoise=.08, historyPenalty=1.8; }
    public static final class Mining { public int breakDelayMs=120, retargetDelayMs=180, jumpCooldownMs=900; public boolean requireTool=true, autoJump=true; }
    public static final class Advanced { public boolean hud=true; public int apiPort=8765, historySize=8; }
    private static List<BlockRule> defaults() { return new ArrayList<>(List.of(
        new BlockRule("minecraft:lapis_ore",true,8), new BlockRule("minecraft:deepslate_lapis_ore",true,8), new BlockRule("minecraft:emerald_ore",true,9),
        new BlockRule("minecraft:deepslate_emerald_ore",true,9), new BlockRule("minecraft:diamond_ore",true,10), new BlockRule("minecraft:deepslate_diamond_ore",true,10),
        new BlockRule("minecraft:lapis_block",true,5), new BlockRule("minecraft:emerald_block",true,6), new BlockRule("minecraft:diamond_block",true,7))); }
    public void validate() {
        schemaVersion=2;
        if(enabledBlocks==null) enabledBlocks=defaults();
        if(movement==null) movement=new Movement(); if(camera==null) camera=new Camera(); if(randomness==null) randomness=new Randomness(); if(mining==null) mining=new Mining(); if(advanced==null) advanced=new Advanced();
        movement.searchDistance=Math.max(2,Math.min(12,movement.searchDistance)); movement.lateralRange=Math.max(1,Math.min(8,movement.lateralRange));
        movement.verticalUp=Math.max(0,Math.min(8,movement.verticalUp)); movement.verticalDown=Math.max(0,Math.min(8,movement.verticalDown));
        camera.horizontalLimit=Math.max(15,Math.min(180,camera.horizontalLimit)); camera.verticalLimit=Math.max(10,Math.min(89,camera.verticalLimit));
        randomness.amount=Math.max(0,Math.min(1,randomness.amount)); mining.breakDelayMs=Math.max(0,Math.min(3000,mining.breakDelayMs));
        advanced.apiPort=Math.max(1024,Math.min(65535,advanced.apiPort)); advanced.historySize=Math.max(4,Math.min(32,advanced.historySize));
        var seen=new HashSet<String>(); enabledBlocks.removeIf(r -> r==null || r.id()==null || !r.id().matches("[a-z0-9_.-]+:[a-z0-9_/.-]+") || !seen.add(r.id()));
        if(enabledBlocks.isEmpty()) enabledBlocks=defaults();
    }
}
