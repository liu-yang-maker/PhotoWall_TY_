import os
import json
from PIL import Image
from concurrent.futures import ThreadPoolExecutor, as_completed


# 清空输出目录
def clear_output_folder(output_folder):
    if os.path.exists(output_folder):
        for filename in os.listdir(output_folder):
            file_path = os.path.join(output_folder, filename)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)
                elif os.path.isdir(file_path):
                    os.rmdir(file_path)
            except Exception as e:
                print(f"Failed to delete {file_path}: {e}")


# 处理单张图片，生成缩略图
def process_image(filename, input_folder, output_folder, size):
    try:
        img_path = os.path.join(input_folder, filename)
        with Image.open(img_path) as img:
            exif_data = img.info.get("exif")
            aspect_ratio = img.width / img.height
            target_ratio = size[0] / size[1]

            # 居中裁剪成接近正方形，再缩放
            if aspect_ratio > target_ratio:
                new_width = int(img.height * target_ratio)
                offset = (img.width - new_width) // 2
                img = img.crop((offset, 0, offset + new_width, img.height))
            elif aspect_ratio < target_ratio:
                new_height = int(img.width / target_ratio)
                offset = (img.height - new_height) // 2
                img = img.crop((0, offset, img.width, offset + new_height))

            img = img.resize(size, Image.LANCZOS)

            thumb_path = os.path.join(output_folder, filename)
            if exif_data:
                img.save(thumb_path, quality=90, optimize=True, exif=exif_data)
            else:
                img.save(thumb_path, quality=90, optimize=True)

            print(f"Thumbnail created for {filename}")
    except Exception as e:
        print(f"Error processing {filename}: {e}")


# 生成缩略图 + image_list.json
def generate_thumbnails(
    input_folder="images",
    output_folder="images/thumbs",
    size=(360, 360),
    max_workers=8,
):
    if not os.path.exists(input_folder):
        os.makedirs(input_folder, exist_ok=True)

    clear_output_folder(output_folder)
    os.makedirs(output_folder, exist_ok=True)

    # 只处理 jpg/jpeg/png/gif/bmp，且排除子目录（例如 thumbs）
    image_files = [
        f
        for f in os.listdir(input_folder)
        if os.path.isfile(os.path.join(input_folder, f))
        and f.lower().endswith((".jpg", ".jpeg", ".png", ".gif", ".bmp"))
    ]

    # 关键：按文件名排序（因为已经是 YYYY-MM-DD_XXX.jpg，会自动按时间顺序）
    image_files = sorted(image_files)

    if not image_files:
        print("No images found in input folder.")
        return

    print(f"Found {len(image_files)} images. Generating thumbnails...")

    # 多线程并行生成缩略图
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(
                process_image, filename, input_folder, output_folder, size
            ): filename
            for filename in image_files
        }

        for future in as_completed(futures):
            filename = futures[future]
            try:
                future.result()
            except Exception as e:
                print(f"Failed to process {filename}: {e}")

    # 生成 image_list.json（供前端 script.js 使用）
    image_list_path = os.path.join(input_folder, "image_list.json")
    try:
        with open(image_list_path, "w", encoding="utf-8") as f:
            json.dump(image_files, f, ensure_ascii=False, indent=2)
        print(f"image_list.json generated at: {image_list_path}")
    except Exception as e:
        print(f"Failed to write image_list.json: {e}")

    print("All thumbnails generated.")


if __name__ == "__main__":
    generate_thumbnails(size=(360, 360), max_workers=8)