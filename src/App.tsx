/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Settings, 
  Image as ImageIcon, 
  Download, 
  Code, 
  Type, 
  Layout, 
  RefreshCw,
  Info,
  Copy,
  Check,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GoogleGenAI } from "@google/genai";

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/// --- Types ---
interface Metadata {
  // Visibility toggles
  showModel: boolean;
  showLora: boolean;
  showSampler: boolean;
  showScheduler: boolean;
  showSeed: boolean;
  showSteps: boolean;
  showCfg: boolean;
  showDenoise: boolean;
  showCustomText: boolean;
  customText: string;
  uppercaseNames: boolean;
  // Mock values for preview
  model: string;
  loras: string;
  sampler: string;
  scheduler: string;
  seed: number;
  steps: number;
  cfg: number;
  denoise: number;
}

interface StyleConfig {
  fontSize: number;
  fontColor: string;
  bgColor: string;
  bgOpacity: number;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'bottom-center';
  padding: number;
  fontFamily: string;
  layoutMode: 'watermark' | 'magazine';
  mastheadSource: 'model' | 'lora';
}

// --- Constants ---
const FONT_OPTIONS = [
  { name: 'Inter (Sans)', value: 'Inter' },
  { name: 'Playfair Display (Serif)', value: 'Playfair Display' },
  { name: 'Space Grotesk (Tech)', value: 'Space Grotesk' },
  { name: 'Anton (Bold Display)', value: 'Anton' },
  { name: 'JetBrains Mono (Mono)', value: 'JetBrains Mono' },
];

const DEFAULT_METADATA: Metadata = {
  showModel: true,
  showLora: true,
  showSampler: true,
  showScheduler: true,
  showSeed: true,
  showSteps: true,
  showCfg: true,
  showDenoise: true,
  showCustomText: true,
  customText: "AI ARTIST",
  uppercaseNames: true,
  model: "aMixIllustrious_aMix.safetensors",
  loras: "Detail_Tweaker, Skin_Texture_v2",
  sampler: "euler_ancestral",
  scheduler: "karras",
  seed: 123456789,
  steps: 25,
  cfg: 7.0,
  denoise: 1.0
};

const DEFAULT_STYLE: StyleConfig = {
  fontSize: 14,
  fontColor: "#ffffff",
  bgColor: "#000000",
  bgOpacity: 0.6,
  position: 'bottom-right',
  padding: 12,
  fontFamily: 'Inter',
  layoutMode: 'magazine',
  mastheadSource: 'model'
};

export default function App() {
  const [metadata, setMetadata] = useState<Metadata>(DEFAULT_METADATA);
  const [style, setStyle] = useState<StyleConfig>(DEFAULT_STYLE);
  const [image, setImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Image Generation (Gemini) ---
  const generateTestImage = async () => {
    setIsGenerating(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key missing");
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{
          parts: [{ text: "A high quality landscape photography, masterpiece, cinematic lighting" }]
        }]
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setImage(`data:image/png;base64,${part.inlineData.data}`);
          break;
        }
      }
    } catch (error) {
      console.error("Generation failed:", error);
      setImage(`https://picsum.photos/seed/${Math.random()}/1024/1024`);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Canvas Rendering (Preview Only) ---
  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = image;
    img.onload = async () => {
      // Ensure fonts are loaded before drawing
      await document.fonts.ready;
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const scaleFactor = canvas.width / 1000;
      const fontSize = style.fontSize * scaleFactor;

      if (style.layoutMode === 'magazine') {
        // --- Magazine Layout 4.0 (Proportional Sizing) ---
        const longEdge = Math.max(canvas.width, canvas.height);
        const margin = longEdge * 0.03; // 3% margin
        
        // Proportional Sizes: 1/6 for Masthead, 1/22 for Sidebar
        const mastheadSize = longEdge / 6;
        const sidebarSize = longEdge / 22;
        
        // 1. Draw Gradients for readability
        // Top Gradient (for Masthead)
        const topGradHeight = longEdge * 0.25;
        const topGrad = ctx.createLinearGradient(0, 0, 0, topGradHeight);
        topGrad.addColorStop(0, `rgba(0,0,0,${style.bgOpacity + 0.3})`);
        topGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, canvas.width, topGradHeight);

        // Right Gradient (for Sidebar)
        const rightGradWidth = longEdge * 0.3;
        const rightGrad = ctx.createLinearGradient(canvas.width - rightGradWidth, 0, canvas.width, 0);
        rightGrad.addColorStop(0, 'transparent');
        rightGrad.addColorStop(1, `rgba(0,0,0,${style.bgOpacity + 0.2})`);
        ctx.fillStyle = rightGrad;
        ctx.fillRect(canvas.width - rightGradWidth, 0, rightGradWidth, canvas.height);

        ctx.fillStyle = style.fontColor;
        
        const cleanName = (name: string) => {
          const cleaned = name.replace(/\.(safetensors|ckpt)$/i, '').replace(/[_.-]/g, ' ');
          return metadata.uppercaseNames ? cleaned.toUpperCase() : cleaned;
        };

        // 2. Top Masthead (Model/LoRA Name with Wrapping)
        const effectiveMastheadSource = (style.mastheadSource === 'model' && metadata.showModel) || !metadata.showLora 
          ? 'model' 
          : 'lora';

        const mastheadText = effectiveMastheadSource === 'model' 
          ? metadata.model
          : metadata.loras;

        if ((effectiveMastheadSource === 'model' && metadata.showModel) || (effectiveMastheadSource === 'lora' && metadata.showLora)) {
          ctx.font = `900 ${mastheadSize}px "${style.fontFamily}", sans-serif`;
          ctx.textBaseline = "top";
          
          const displayMainText = cleanName(mastheadText);
          const words = displayMainText.split(" ");
          let line = "";
          let y = margin;
          const maxWidth = canvas.width - margin * 2;

          for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + " ";
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
              ctx.fillText(line.trim(), margin, y);
              line = words[n] + " ";
              y += mastheadSize * 0.85;
            } else {
              line = testLine;
            }
          }
          ctx.fillText(line.trim(), margin, y);
          y += mastheadSize * 0.85;

          // 2.1 Sub-Masthead (The one not chosen as main)
          const subSource = effectiveMastheadSource === 'model' ? 'lora' : 'model';
          const showSub = subSource === 'model' ? metadata.showModel : metadata.showLora;
          const subTextRaw = subSource === 'model' ? metadata.model : metadata.loras;

          if (showSub && subTextRaw) {
            const subSize = mastheadSize / 3;
            ctx.font = `600 ${subSize}px "${style.fontFamily}", sans-serif`;
            ctx.globalAlpha = 0.8;
            ctx.fillText(cleanName(subTextRaw), margin, y + margin * 0.5);
            ctx.globalAlpha = 1.0;
          }
        }

        // 3. Right Sidebar (Metadata Features)
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        
        const metaItems: {label: string, value: string}[] = [];
        if (metadata.showSampler) metaItems.push({label: "SAMPLER", value: metadata.sampler});
        if (metadata.showScheduler) metaItems.push({label: "SCHEDULER", value: metadata.scheduler});
        if (metadata.showSteps) metaItems.push({label: "STEPS", value: metadata.steps.toString()});
        if (metadata.showCfg) metaItems.push({label: "CFG", value: metadata.cfg.toString()});
        if (metadata.showSeed) metaItems.push({label: "SEED", value: metadata.seed.toString()});
        if (metadata.showDenoise) metaItems.push({label: "DENOISE", value: metadata.denoise.toString()});

        let currentY = canvas.height - margin;
        metaItems.reverse().forEach((item) => {
          // Value
          ctx.font = `bold ${sidebarSize}px "${style.fontFamily}", sans-serif`;
          ctx.globalAlpha = 1.0;
          ctx.fillText(item.value.toUpperCase(), canvas.width - margin, currentY);
          currentY -= sidebarSize * 0.9;
          
          // Label
          ctx.font = `600 ${sidebarSize * 0.4}px "${style.fontFamily}", sans-serif`;
          ctx.globalAlpha = 0.6;
          ctx.fillText(item.label, canvas.width - margin, currentY);
          currentY -= sidebarSize * 0.8;
        });

        // Reset context
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.globalAlpha = 1.0;

      } else {
        // --- Classic Watermark Rendering ---
        const lines: string[] = [];
        const cleanName = (name: string) => {
          const cleaned = name.replace(/\.(safetensors|ckpt)$/i, '').replace(/[_.-]/g, ' ');
          return metadata.uppercaseNames ? cleaned.toUpperCase() : cleaned;
        };

        if (metadata.showModel) lines.push(`Model: ${cleanName(metadata.model)}`);
        
        let line2 = "";
        if (metadata.showLora && metadata.loras) line2 += `LoRA: ${cleanName(metadata.loras)} `;
        if (metadata.showSampler) line2 += `Sampler: ${metadata.sampler} `;
        if (metadata.showScheduler) line2 += `| Scheduler: ${metadata.scheduler} `;
        if (metadata.showSteps) line2 += `| Steps: ${metadata.steps} `;
        if (metadata.showCfg) line2 += `| CFG: ${metadata.cfg}`;
        if (line2.trim()) lines.push(line2.trim().replace(/^\| /, ''));

        let line3 = "";
        if (metadata.showSeed) line3 += `Seed: ${metadata.seed} `;
        if (metadata.showDenoise) line3 += `| Denoise: ${metadata.denoise}`;
        if (line3.trim()) lines.push(line3.trim().replace(/^\| /, ''));

        if (metadata.showCustomText && metadata.customText) lines.push(metadata.customText);

        if (lines.length === 0) return;

        ctx.font = `${fontSize}px "${style.fontFamily}", monospace`;
        const textMetrics = lines.map(line => ctx.measureText(line));
        const maxWidth = Math.max(...textMetrics.map(m => m.width));
        const lineHeight = fontSize * 1.4;
        const totalHeight = lines.length * lineHeight;
        
        const padding = style.padding * scaleFactor;
        const rectWidth = maxWidth + padding * 2;
        const rectHeight = totalHeight + padding * 2;

        let x = 0; let y = 0;
        const margin = 20 * scaleFactor;

        switch (style.position) {
          case 'bottom-right': x = canvas.width - rectWidth - margin; y = canvas.height - rectHeight - margin; break;
          case 'bottom-left': x = margin; y = canvas.height - rectHeight - margin; break;
          case 'top-right': x = canvas.width - rectWidth - margin; y = margin; break;
          case 'top-left': x = margin; y = margin; break;
          case 'bottom-center': x = (canvas.width - rectWidth) / 2; y = canvas.height - rectHeight - margin; break;
        }

        ctx.globalAlpha = style.bgOpacity;
        ctx.fillStyle = style.bgColor;
        ctx.beginPath();
        ctx.roundRect(x, y, rectWidth, rectHeight, 8 * scaleFactor);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        ctx.fillStyle = style.fontColor;
        lines.forEach((line, i) => {
          ctx.fillText(line, x + padding, y + padding + fontSize + (i * lineHeight));
        });
      }
    };
  }, [image, metadata, style]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setImage(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(pythonCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- Python Code Template ---
  const toPyBool = (val: boolean) => val ? "True" : "False";

  const pythonCode = `# --- watermark_node.py ---
import torch
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import os

class MetadataWatermark:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "images": ("IMAGE",),
                "show_model": ("BOOLEAN", {"default": ${toPyBool(metadata.showModel)}}),
                "show_lora": ("BOOLEAN", {"default": ${toPyBool(metadata.showLora)}}),
                "show_sampler": ("BOOLEAN", {"default": ${toPyBool(metadata.showSampler)}}),
                "show_scheduler": ("BOOLEAN", {"default": ${toPyBool(metadata.showScheduler)}}),
                "show_seed": ("BOOLEAN", {"default": ${toPyBool(metadata.showSeed)}}),
                "show_steps": ("BOOLEAN", {"default": ${toPyBool(metadata.showSteps)}}),
                "show_cfg": ("BOOLEAN", {"default": ${toPyBool(metadata.showCfg)}}),
                "show_denoise": ("BOOLEAN", {"default": ${toPyBool(metadata.showDenoise)}}),
                "show_custom_text": ("BOOLEAN", {"default": ${toPyBool(metadata.showCustomText)}}),
                "custom_text": ("STRING", {"default": "${metadata.customText}"}),
                "uppercase_names": ("BOOLEAN", {"default": ${toPyBool(metadata.uppercaseNames)}}),
                "layout_mode": (["watermark", "magazine"], {"default": "${style.layoutMode}"}),
                "masthead_source": (["model", "lora"], {"default": "${style.mastheadSource}"}),
                "font_family": (["Inter", "Playfair Display", "Space Grotesk", "Anton", "JetBrains Mono"], {"default": "${style.fontFamily}"}),
                "font_size": ("INT", {"default": ${style.fontSize}, "min": 1, "max": 256}),
                "position": (["bottom-right", "bottom-left", "top-right", "top-left", "bottom-center"], {"default": "${style.position}"}),
                "bg_opacity": ("FLOAT", {"default": ${style.bgOpacity}, "min": 0.0, "max": 1.0}),
            },
            "hidden": {
                "prompt": "PROMPT",
                "extra_pnginfo": "EXTRA_PNGINFO"
            }
        }

    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "apply_watermark"
    CATEGORY = "image/postprocessing"

    def apply_watermark(self, images, show_model, show_lora, show_sampler, show_scheduler, show_seed, show_steps, show_cfg, show_denoise, show_custom_text, custom_text, uppercase_names, layout_mode, masthead_source, font_family, font_size, position, bg_opacity, 
                        prompt=None, extra_pnginfo=None):
        
        # --- Global Feature Scan Metadata Extraction ---
        model_name = "Unknown"
        lora_names = []
        sampler_name = "Unknown"
        scheduler = "Unknown"
        seed = "N/A"
        cfg = "N/A"
        steps = "N/A"
        denoise = "N/A"

        # 1. Aggressive Scan of 'prompt' (Workflow Nodes)
        if prompt is not None:
            potential_models = []
            for node_id in prompt:
                node = prompt[node_id]
                inputs = node.get("inputs", {})
                class_type = node.get("class_type", "")
                
                # Find KSampler info
                if "KSampler" in class_type:
                    seed = str(inputs.get("seed", seed))
                    steps = str(inputs.get("steps", steps))
                    cfg = str(inputs.get("cfg", cfg))
                    sampler_name = str(inputs.get("sampler_name", sampler_name))
                    scheduler = str(inputs.get("scheduler", scheduler))
                    denoise = str(inputs.get("denoise", denoise))
                
                if "LoraLoader" in class_type:
                    l_path = inputs.get("lora_name", "")
                    if l_path:
                        # Clean name: remove path and extension
                        l_name = os.path.basename(l_path).split(".")[0]
                        l_name = l_name.replace("_", " ").replace("-", " ")
                        if l_name not in lora_names:
                            lora_names.append(l_name)
                
                # Scan ALL inputs for anything looking like a model filename
                for key, value in inputs.items():
                    if isinstance(value, str) and (value.endswith(".safetensors") or value.endswith(".ckpt")):
                        # Weighting System
                        weight = 0
                        k_lower = key.lower()
                        c_lower = class_type.lower()
                        
                        # High Priority: Checkpoint, UNET, Model
                        if any(x in k_lower for x in ["ckpt", "unet", "model"]): weight += 20
                        if any(x in c_lower for x in ["loader", "checkpoint"]): weight += 10
                        
                        # Low Priority: CLIP, VAE, ControlNet
                        if any(x in k_lower for x in ["clip", "vae", "controlnet"]): weight -= 15
                        
                        potential_models.append((weight, value))
            
            if potential_models:
                # Sort by weight and pick the best one
                potential_models.sort(key=lambda x: x[0], reverse=True)
                model_name = potential_models[0][1]
                print(f"[MetadataWatermark] Best model candidate: {model_name} (Weight: {potential_models[0][0]})")

        # 2. Deep Scan 'extra_pnginfo' (Fallback & LoRA handling)
        if model_name == "Unknown" and extra_pnginfo is not None:
            # Check common keys and nested metadata
            search_keys = ["model_name", "Model", "Checkpoint", "base_model", "active_loras", "workflow"]
            for key in search_keys:
                val = extra_pnginfo.get(key)
                if val:
                    if isinstance(val, list) and len(val) > 0:
                        model_name = str(val[0])
                    elif isinstance(val, dict):
                        # Try to find a model-like string inside the dict
                        for k, v in val.items():
                            if isinstance(v, str) and (".safetensors" in v or ".ckpt" in v):
                                model_name = v
                                break
                    else:
                        model_name = str(val)
                    
                    if model_name != "Unknown":
                        print(f"[MetadataWatermark] Found model in extra_pnginfo ({key}): {model_name}")
                        break

        # Clean up and extract filename
        if isinstance(model_name, str) and model_name != "Unknown":
            import re
            # Extract filename from paths or complex strings
            match = re.search(r'([^\\/]+\.(safetensors|ckpt))', model_name)
            if match:
                model_name = match.group(1)
            else:
                model_name = os.path.basename(model_name)

        results = []
        for image in images:
            i = 255. * image.cpu().numpy()
            img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8)).convert("RGBA")
            overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
            draw = ImageDraw.Draw(overlay)
            
            scale = img.width / 1000.0
            actual_font_size = max(10, int(font_size * scale))
            
            # --- Font Selection System ---
            font_path = None
            font_bold_path = None
            
            # Map selected font family to common system font names
            font_map = {
                "Inter": ["Inter-Regular", "Inter", "Arial"],
                "Playfair Display": ["PlayfairDisplay-Regular", "Playfair Display", "Georgia", "Times New Roman"],
                "Space Grotesk": ["SpaceGrotesk-Regular", "Space Grotesk", "Verdana"],
                "Anton": ["Anton-Regular", "Anton", "Impact"],
                "JetBrains Mono": ["JetBrainsMono-Regular", "JetBrains Mono", "Courier New", "monospace"]
            }
            
            target_fonts = font_map.get(font_family, ["Arial"])
            
            # Common system font directories
            font_dirs = [
                "/System/Library/Fonts/Supplemental",
                "/usr/share/fonts/truetype",
                "/usr/share/fonts/TTF",
                "C:\\Windows\\Fonts",
                os.path.join(os.path.dirname(__file__), "fonts")
            ]
            
            def find_font(names):
                for d in font_dirs:
                    if not os.path.exists(d): continue
                    for root, _, files in os.walk(d):
                        for f in files:
                            f_lower = f.lower()
                            for name in names:
                                n_lower = name.lower()
                                if n_lower in f_lower and (f_lower.endswith(".ttf") or f_lower.endswith(".otf")):
                                    return os.path.join(root, f)
                return None

            font_path = find_font(target_fonts)
            font_bold_path = find_font([f + "-Bold" for f in target_fonts] + [f + "Bold" for f in target_fonts] + target_fonts)
            
            if not font_path:
                # Absolute fallback
                fallback_paths = [
                    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                    "C:\\Windows\\Fonts\\arial.ttf",
                    "arial.ttf"
                ]
                for p in fallback_paths:
                    if os.path.exists(p):
                        font_path = p
                        break
            
            if not font_bold_path: font_bold_path = font_path

            if layout_mode == "magazine":
                # --- Magazine Layout 4.0 (Proportional Sizing) ---
                long_edge = max(img.width, img.height)
                margin = int(long_edge * 0.03)
                
                # Proportional Sizes: 1/6 for Masthead, 1/22 for Sidebar
                masthead_size = int(long_edge / 6)
                sidebar_size = int(long_edge / 22)
                
                # Create fonts
                try:
                    m_font_title = ImageFont.truetype(font_bold_path, masthead_size) if font_bold_path else ImageFont.load_default()
                    m_font_meta = ImageFont.truetype(font_path, sidebar_size) if font_path else ImageFont.load_default()
                    m_font_label = ImageFont.truetype(font_path, int(sidebar_size * 0.4)) if font_path else ImageFont.load_default()
                except:
                    m_font_title = ImageFont.load_default()
                    m_font_meta = ImageFont.load_default()
                    m_font_label = ImageFont.load_default()

                # 1. Gradients
                # Top Gradient
                top_grad_height = int(long_edge * 0.25)
                for y in range(0, top_grad_height):
                    progress = 1.0 - (y / top_grad_height)
                    alpha = int(255 * (bg_opacity + 0.3) * (progress ** 1.5))
                    draw.line([(0, y), (img.width, y)], fill=(0, 0, 0, min(255, alpha)))

                # Right Gradient
                right_grad_width = int(long_edge * 0.3)
                for x in range(img.width - right_grad_width, img.width):
                    progress = (x - (img.width - right_grad_width)) / right_grad_width
                    alpha = int(255 * (bg_opacity + 0.2) * (progress ** 1.5))
                    draw.line([(x, 0), (x, img.height)], fill=(0, 0, 0, min(255, alpha)))

                # 2. Top Masthead (Wrapped)
                def process_name(name):
                    import re
                    cleaned = re.sub(r'\.(safetensors|ckpt)$', '', name, flags=re.IGNORECASE)
                    cleaned = re.sub(r'[_.\s-]', ' ', cleaned).strip()
                    return cleaned.upper() if uppercase_names else cleaned

                effective_masthead = "model"
                if masthead_source == "lora" and show_lora and lora_names:
                    effective_masthead = "lora"
                elif not show_model and show_lora and lora_names:
                    effective_masthead = "lora"
                
                main_text = ""
                sub_text = ""
                
                if effective_masthead == "model":
                    main_text = process_name(model_name)
                    if show_lora and lora_names:
                        sub_text = " • ".join([process_name(l) for l in lora_names])
                else:
                    main_text = " • ".join([process_name(l) for l in lora_names])
                    if show_model:
                        sub_text = process_name(model_name)

                if main_text:
                    words = main_text.split(" ")
                    lines = []
                    current_line = ""
                    max_w = img.width - margin * 2
                    
                    for word in words:
                        test_line = f"{current_line}{word} "
                        bbox = draw.textbbox((0, 0), test_line, font=m_font_title)
                        if (bbox[2] - bbox[0]) > max_w and current_line:
                            lines.append(current_line.strip())
                            current_line = f"{word} "
                        else:
                            current_line = test_line
                    lines.append(current_line.strip())

                    y_offset = margin
                    for line in lines:
                        draw.text((margin, y_offset), line, font=m_font_title, fill=(255, 255, 255, 255))
                        y_offset += int(masthead_size * 0.85)

                    # Sub-Masthead
                    if sub_text:
                        sub_size = int(masthead_size / 3)
                        try:
                            s_font = ImageFont.truetype(font_path, sub_size)
                        except:
                            s_font = ImageFont.load_default()
                        draw.text((margin, y_offset + int(margin * 0.5)), sub_text, font=s_font, fill=(255, 255, 255, 200))

                # 3. Right Sidebar (Stacked)
                meta_items = []
                if show_sampler: meta_items.append(("SAMPLER", sampler_name))
                if show_scheduler: meta_items.append(("SCHEDULER", scheduler))
                if show_steps: meta_items.append(("STEPS", str(steps)))
                if show_cfg: meta_items.append(("CFG", str(cfg)))
                if show_seed: meta_items.append(("SEED", str(seed)))
                if show_denoise: meta_items.append(("DENOISE", str(denoise)))
                if show_custom_text and custom_text: meta_items.append(("NOTE", custom_text))

                y_cursor = img.height - margin
                for label, value in reversed(meta_items):
                    # Value
                    v_val = value.upper()
                    v_bbox = draw.textbbox((0, 0), v_val, font=m_font_meta)
                    v_w = v_bbox[2] - v_bbox[0]
                    draw.text((img.width - margin - v_w, y_cursor - sidebar_size), v_val, font=m_font_meta, fill=(255, 255, 255, 255))
                    y_cursor -= int(sidebar_size * 0.9)
                    
                    # Label
                    l_val = label
                    l_bbox = draw.textbbox((0, 0), l_val, font=m_font_label)
                    l_w = l_bbox[2] - l_bbox[0]
                    draw.text((img.width - margin - l_w, y_cursor - int(sidebar_size * 0.4)), l_val, font=m_font_label, fill=(255, 255, 255, 150))
                    y_cursor -= int(sidebar_size * 0.8)
            
            else:
                # --- Classic Watermark Layout ---
                def process_name(name):
                    cleaned = re.sub(r'\.(safetensors|ckpt)$', '', name, flags=re.IGNORECASE)
                    cleaned = re.sub(r'[_.\s-]', ' ', cleaned).strip()
                    return cleaned.upper() if uppercase_names else cleaned

                # Re-load font for classic if needed
                try:
                    c_font = ImageFont.truetype(font_path, actual_font_size) if font_path else ImageFont.load_default()
                except:
                    c_font = ImageFont.load_default()
                lines = []
                if show_model: lines.append(f"Model: {process_name(model_name)}")
                
                line2 = ""
                if show_lora and lora_names:
                    processed_loras = [process_name(l) for l in lora_names]
                    line2 += f"LoRA: {', '.join(processed_loras)} "
                if show_sampler: line2 += f"Sampler: {sampler_name} "
                if show_scheduler: line2 += f"| Scheduler: {scheduler} "
                if show_steps: line2 += f"| Steps: {steps} "
                if show_cfg: line2 += f"| CFG: {cfg}"
                if line2.strip(): lines.append(line2.strip().lstrip("| "))

                line3 = ""
                if show_seed: line3 += f"Seed: {seed} "
                if show_denoise: line3 += f"| Denoise: {denoise}"
                if line3.strip(): lines.append(line3.strip().lstrip("| "))
                
                if show_custom_text and custom_text: lines.append(custom_text)

                if not lines:
                    results.append(image)
                    continue

                max_w = 0
                line_h = int(actual_font_size * 1.4)
                for line in lines:
                    bbox = draw.textbbox((0, 0), line, font=c_font)
                    max_w = max(max_w, bbox[2] - bbox[0])
                
                rect_w = max_w + int(12 * 2 * scale)
                rect_h = (len(lines) * line_h) + int(12 * 2 * scale)
                
                margin = int(20 * scale)
                if position == "bottom-right": x, y = img.width - rect_w - margin, img.height - rect_h - margin
                elif position == "bottom-left": x, y = margin, img.height - rect_h - margin
                elif position == "top-right": x, y = img.width - rect_w - margin, margin
                elif position == "top-left": x, y = margin, margin
                else: x, y = (img.width - rect_w) // 2, img.height - rect_h - margin
                
                draw.rectangle([x, y, x + rect_w, y + rect_h], fill=(0, 0, 0, int(255 * bg_opacity)))
                for idx, line in enumerate(lines):
                    draw.text((x + int(12 * scale), y + int(12 * scale) + idx * line_h), line, font=c_font, fill=(255, 255, 255, 255))

            img = Image.alpha_composite(img, overlay).convert("RGB")
            res = np.array(img).astype(np.float32) / 255.0
            results.append(torch.from_numpy(res))

        return (torch.stack(results, dim=0),)

# --- __init__.py ---
# from .watermark_node import MetadataWatermark
# NODE_CLASS_MAPPINGS = {"MetadataWatermark": MetadataWatermark}
# NODE_DISPLAY_NAME_MAPPINGS = {"MetadataWatermark": "Metadata Watermark"}
`;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e0e0e0] font-sans selection:bg-orange-500/30">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">ComfyUI Watermark Designer</h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveTab('preview')}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                activeTab === 'preview' ? "bg-white text-black" : "text-white/60 hover:text-white"
              )}
            >
              Preview
            </button>
            <button 
              onClick={() => setActiveTab('code')}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                activeTab === 'code' ? "bg-white text-black" : "text-white/60 hover:text-white"
              )}
            >
              Export Code
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
        
        {/* Sidebar Controls */}
        <aside className="space-y-6">
          {/* Visibility Toggles */}
          <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-white/40 mb-2">
              <Info className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Auto-Extract Content</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'showModel', label: 'Model' },
                { id: 'showLora', label: 'LoRA' },
                { id: 'showSampler', label: 'Sampler' },
                { id: 'showScheduler', label: 'Scheduler' },
                { id: 'showSteps', label: 'Steps' },
                { id: 'showCfg', label: 'CFG' },
                { id: 'showSeed', label: 'Seed' },
                { id: 'showDenoise', label: 'Denoise' },
                { id: 'showCustomText', label: 'Custom Text' },
                { id: 'uppercaseNames', label: 'Uppercase Names' },
              ].map(item => (
                <label key={item.id} className="flex items-center gap-3 p-2 bg-black/20 rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={metadata[item.id as keyof Metadata] as boolean}
                    onChange={e => setMetadata({...metadata, [item.id]: e.target.checked})}
                    className="w-4 h-4 accent-orange-600"
                  />
                  <span className="text-xs font-medium">{item.label}</span>
                </label>
              ))}
            </div>

            {metadata.showCustomText && (
              <div className="space-y-1.5 pt-2 border-t border-white/5">
                <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Custom Content</label>
                <input 
                  type="text"
                  value={metadata.customText}
                  onChange={e => setMetadata({...metadata, customText: e.target.value})}
                  placeholder="e.g. AI Artist / Photographer"
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white/80 focus:border-orange-500 outline-none transition-all"
                />
              </div>
            )}
            <p className="text-[10px] text-white/30 italic">Note: Values will be automatically extracted from your ComfyUI workflow at runtime.</p>
          </section>

          {/* Style Section */}
          <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-white/40 mb-2">
              <Layout className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Watermark Style</span>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Font Family</label>
                <select 
                  value={style.fontFamily}
                  onChange={e => setStyle({...style, fontFamily: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white/80 focus:border-orange-500 outline-none transition-all"
                >
                  {FONT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-zinc-900">{opt.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Layout Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['watermark', 'magazine'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setStyle({...style, layoutMode: mode})}
                      className={cn(
                        "text-[10px] py-1.5 border rounded-md transition-all capitalize",
                        style.layoutMode === mode ? "bg-orange-600 border-orange-500 text-white" : "bg-black/20 border-white/10 text-white/40 hover:border-white/30"
                      )}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {style.layoutMode === 'magazine' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Masthead Source</label>
                  <select 
                    value={style.mastheadSource}
                    onChange={e => setStyle({...style, mastheadSource: e.target.value as any})}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white/80 focus:border-orange-500 outline-none transition-all"
                  >
                    <option value="model" className="bg-zinc-900">Model Name</option>
                    <option value="lora" className="bg-zinc-900">LoRA Names</option>
                  </select>
                  <p className="text-[10px] text-white/30 italic">Fallback to other if hidden.</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Position</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'bottom-center'] as const).map(pos => (
                    <button
                      key={pos}
                      onClick={() => setStyle({...style, position: pos})}
                      className={cn(
                        "text-[10px] py-1.5 border rounded-md transition-all",
                        style.position === pos ? "bg-orange-600 border-orange-500 text-white" : "bg-black/20 border-white/10 text-white/40 hover:border-white/30"
                      )}
                    >
                      {pos.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Font Size</label>
                  <input 
                    type="range" min="8" max="48" 
                    value={style.fontSize}
                    onChange={e => setStyle({...style, fontSize: parseInt(e.target.value)})}
                    className="w-full accent-orange-600"
                  />
                  <div className="text-[10px] text-right text-white/40">{style.fontSize}px</div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Opacity</label>
                  <input 
                    type="range" min="0" max="1" step="0.1"
                    value={style.bgOpacity}
                    onChange={e => setStyle({...style, bgOpacity: parseFloat(e.target.value)})}
                    className="w-full accent-orange-600"
                  />
                  <div className="text-[10px] text-right text-white/40">{Math.round(style.bgOpacity * 100)}%</div>
                </div>
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="space-y-3">
            <button 
              onClick={generateTestImage}
              disabled={isGenerating}
              className="w-full bg-white text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-orange-500 hover:text-white transition-all disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              Generate Test Image
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-white/5 border border-white/10 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
            >
              <ImageIcon className="w-5 h-5" />
              Upload Local Image
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="min-h-[600px] flex flex-col">
          <AnimatePresence mode="wait">
            {activeTab === 'preview' ? (
              <motion.div 
                key="preview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 bg-black/40 border border-white/10 rounded-3xl overflow-hidden relative flex items-center justify-center p-8"
              >
                {!image ? (
                  <div className="text-center space-y-4 max-w-xs">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <ImageIcon className="w-8 h-8 text-white/20" />
                    </div>
                    <h3 className="text-xl font-semibold text-white/80">No Image Selected</h3>
                    <p className="text-sm text-white/40">Generate a test image or upload your own to preview the watermark placement.</p>
                  </div>
                ) : (
                  <div className="relative group max-w-full max-h-full">
                    <canvas 
                      ref={canvasRef} 
                      className="max-w-full max-h-[70vh] rounded-xl shadow-2xl shadow-black/50"
                    />
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="code"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 bg-[#0d0d0d] border border-white/10 rounded-3xl overflow-hidden flex flex-col"
              >
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-orange-500" />
                    <span className="text-xs font-bold uppercase tracking-widest">ComfyUI Custom Node (Python)</span>
                  </div>
                  <button 
                    onClick={copyCode}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-6 font-mono text-sm leading-relaxed text-white/70">
                  <pre className="whitespace-pre-wrap">
                    {pythonCode}
                  </pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Info */}
          <div className="mt-6 flex items-center justify-between text-[11px] text-white/30 uppercase tracking-[0.2em] font-bold">
            <div className="flex gap-6">
              <span>Version 1.2.0</span>
              <span>ComfyUI Node Designer</span>
            </div>
            <div className="flex gap-6">
              <span>Zero-Config Auto Discovery</span>
              <span>© 2026 AI Studio</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

