package dev.autominer;
import java.util.concurrent.ThreadLocalRandom;
public final class RandomizationController { public long vary(long base,AutoMinerConfig.Randomness cfg){if(!cfg.enabled)return base;double delta=(ThreadLocalRandom.current().nextDouble()*2-1)*cfg.timingNoise;return Math.max(0,Math.round(base*(1+delta)));} }
