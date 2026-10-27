# Example Dataset

This folder is where you put a sample capture for testing the pipeline. The repository does not ship photos of
an object, so add your own. Photos are not committed because they are large and may be personal.

## Capture walkthrough

1. **Object:** matte, textured, non-reflective, and not too small. Avoid glass, chrome and plain white objects.
2. **Setup:** place the object on a plain surface with some texture, such as a patterned mat, in even, diffuse
   light. Do not use a flash or direct sun.
3. **Camera:** fixed focus and exposure if your phone allows it. Keep the object sharp at full resolution.
4. **Path:** walk a circle around the object at three heights (low, eye level, high). Then take a ring of
   shots looking down at the top.
5. **Count:** 50-80 photos is a good target. The app requires at least 20 and accepts up to 150.
6. **Overlap:** neighbouring photos should share roughly 60-80% of the view.
7. **Resolution:** the shorter side must be at least 1024 px. Phone defaults are usually well above this.

## Layout

```
sample_dataset/
  README.md          this file
  my-object/         one folder per object
    IMG_0001.jpg
    IMG_0002.jpg
    ...
```

## Walkthrough

1. Start the stack (see the main README) and open http://localhost:3000.
2. Create an account or continue as a guest.
3. On **New model**, drag the `my-object/` photos onto the dropzone. Watch the validation messages.
4. Click **Upload photos** and wait for the progress bar to finish.
5. Leave the default print settings (100 mm largest dimension, 100% size, auto-fit) and click
   **Generate 3D Model**.
6. On the model page, watch the stages move from Upload Complete through STL Export.
7. When the status is Completed, rotate the preview, toggle Wireframe, and check the report: watertight,
   non-manifold edges, estimated volume, print time and size.
8. Download the STL and open it in Bambu Studio on the A1 Mini profile.

Expected runtime on an RTX 4070 with 12+ cores: roughly 10 minutes for 50 photos and 20 minutes for 100 photos
(the performance target in the requirements). Actual times depend on image size and scene texture.
