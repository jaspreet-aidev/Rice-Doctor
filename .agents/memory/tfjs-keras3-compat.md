---
name: TF.js + Keras 3 model.json compatibility
description: Converting a Keras 3 saved model to TF.js loadLayersModel format — patches and custom layer patterns required.
---

## The Problem
Models saved with Keras 3 (TF 2.16+) produce a `model.json` format that `tf.loadLayersModel` cannot parse directly.

## Required model.json patches (apply in Python before shipping)

1. **`batch_shape` → `batch_input_shape`** in InputLayer configs  
   Keras 3 uses `batch_shape`; TF.js expects `batch_input_shape`.

2. **`inbound_nodes` format conversion** (most important)  
   - Keras 3: `[{"args": [{"class_name": "__keras_tensor__", "config": {"keras_history": ["prev", 0, 0]}}, optional_scalar], "kwargs": {}}]`  
   - Keras 2 (TF.js): `[[["prev", 0, 0, {}]]]`  
   - Drop scalar constants from args (hard-code them in custom call() instead).

3. **Strip `DTypePolicy` objects** from layer configs  
   Keras 3 embeds `{"class_name": "DTypePolicy", "config": {"name": "float32"}}` as dtype values in layer configs. Replace with plain string `"float32"`.

## Custom layer registration pattern in TF.js

```ts
class MyLayer extends tf.layers.Layer {
  static className = "MyLayer";          // NOT static override className
  call(inputs) { ... }                   // NOT override call()
  override computeOutputShape(s) { ... } // CAN be override
  getConfig() { return {...super.getConfig()}; } // NOT override getConfig()
}
tf.serialization.registerClass(MyLayer);
```

## tf.Shape vs tf.Shape[] disambiguation

`tf.Shape = Array<number|null>` — so `Array.isArray(shape)` is ALWAYS true.  
To detect `tf.Shape[]` (multiple shapes): check `Array.isArray(shape[0])`.

## MobileNetV2 normalization in Keras 3 models

Preprocessing chain: `Input (0–255) → Sequential(augmentations) → TrueDivide(÷127.5) → Subtract(-1) → MobileNetV2`  
Result: `[-1, 1]` range. **Do NOT do /255 in JS predict code.** Pass raw float32 pixels.

**Why:** Augmentation layers (RandomFlip, RandomRotation, RandomZoom) are identity at inference. TrueDivide and Subtract handle the normalization the model expects.

## Conversion script location
`artifacts/rice-detector/public/model/model.json` — already patched.
