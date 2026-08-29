package dev.autominer;

import java.util.*;

public final class AutoMinerConfig {
    public List<BlockRule> enabledBlocks = defaults();
    public Movement movement = new Movement();
    public Camera camera = new Camera();
    public Randomness randomness = new Randomness();
    public Mining mining = new Mining();
    public Advanced advanced = new Advanced();
    public record BlockRule(String id, boolean enabled, int priority) {}
    public static final class Movement { public boolean sprint=true; public double baseSpeed=1; public int lateralRange=4, verticalUp=3, verticalDown=2, searchDistance=6; }
    public static final class Camera { public float yawSpeed=6, pitchSpeed=5, smoothing=.82f, horizontalLimit=75, verticalLimit=60, variation=.7f; }
    public static final class Randomness { public boolean enabled=true; public double targetNoise=.12, timingNoise=.08, historyPenalty=1.8; }
    public static final class Mining { public int breakDelayMs=120, retargetDelayMs=180, jumpCooldownMs=900; public boolean requireTool=true, autoJump=true; }
    public static final class Advanced { public boolean hud=true; public int apiPort=8765, historySize=12; }
    private static List<BlockRule> defaults() { return new ArrayList<>(List.of(
        new BlockRule("minecraft:coal_ore",true,6), new BlockRule("minecraft:iron_ore",true,7), new BlockRule("minecraft:copper_ore",true,4),
        new BlockRule("minecraft:gold_ore",true,8), new BlockRule("minecraft:redstone_ore",true,5), new BlockRule("minecraft:lapis_ore",true,6),
        new BlockRule("minecraft:diamond_ore",true,10), new BlockRule("minecraft:emerald_ore",true,10), new BlockRule("minecraft:deepslate_diamond_ore",true,10))); }
    public void validate() {
        movement.searchDistance=Math.max(2,Math.min(12,movement.searchDistance)); movement.lateralRange=Math.max(1,Math.min(8,movement.lateralRange));
        advanced.apiPort=Math.max(1024,Math.min(65535,advanced.apiPort)); advanced.historySize=Math.max(4,Math.min(32,advanced.historySize));
        var seen=new HashSet<String>(); enabledBlocks.removeIf(r -> !r.id.matches("[a-z0-9_.-]+:[a-z0-9_/.-]+") || !seen.add(r.id));
    }
}
