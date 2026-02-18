import os
import json
import subprocess
from PIL import Image
from concurrent.futures import ThreadPoolExecutor, as_completed

# 支持的视频格式（用于生成缩略图）
VIDEO_EXTENSIONS = (".mp4", ".mov", ".webm", ".avi", ".mkv")


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


# 处理视频文件，用 ffmpeg 提取第一帧作为缩略图
def process_video(filename, input_folder, output_folder, size):
    try:
        video_path = os.path.join(input_folder, filename)
        base_name = os.path.splitext(filename)[0]
        thumb_filename = base_name + ".jpg"
        thumb_path = os.path.join(output_folder, thumb_filename)

        # 尝试用 ffmpeg 提取第 1 秒处的帧（避免黑屏）
        try:
            result = subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-i", video_path,
                    "-ss", "00:00:01",
                    "-vframes", "1",
                    "-vf", f"scale={size[0]}:{size[1]}:force_original_aspect_ratio=decrease,pad={size[0]}:{size[1]}:(ow-iw)/2:(oh-ih)/2",
                    thumb_path,
                ],
                capture_output=True,
                timeout=30,
            )
            if result.returncode == 0 and os.path.exists(thumb_path):
                print(f"Video thumbnail created for {filename}")
                return
        except (FileNotFoundError, subprocess.TimeoutExpired) as e:
            pass

        # ffmpeg 不可用或失败时，用 PIL 生成占位图
        placeholder = Image.new("RGB", size, (220, 220, 235))
        try:
            from PIL import ImageDraw, ImageFont
            draw = ImageDraw.Draw(placeholder)
            text = "VIDEO"
            bbox = draw.textbbox((0, 0), text)
            tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
            draw.text(((size[0] - tw) // 2, (size[1] - th) // 2), text, fill=(150, 150, 170))
        except Exception:
            pass
        placeholder.save(thumb_path, quality=85)
        print(f"Video placeholder created for {filename} (ffmpeg not available)")
    except Exception as e:
        print(f"Error processing video {filename}: {e}")


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

    # 处理图片和视频，排除子目录（例如 thumbs）
    image_extensions = (".jpg", ".jpeg", ".png", ".gif", ".bmp")
    all_files = [
        f
        for f in os.listdir(input_folder)
        if os.path.isfile(os.path.join(input_folder, f))
        and (
            f.lower().endswith(image_extensions)
            or f.lower().endswith(VIDEO_EXTENSIONS)
        )
    ]

    image_files = [f for f in all_files if f.lower().endswith(image_extensions)]
    video_files = [f for f in all_files if f.lower().endswith(VIDEO_EXTENSIONS)]
    media_files = sorted(image_files + video_files)

    if not media_files:
        print("No images or videos found in input folder.")
        return

    print(f"Found {len(image_files)} images, {len(video_files)} videos. Generating thumbnails...")

    # 多线程并行生成缩略图
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {}
        for filename in image_files:
            futures[
                executor.submit(
                    process_image, filename, input_folder, output_folder, size
                )
            ] = filename
        for filename in video_files:
            futures[
                executor.submit(
                    process_video, filename, input_folder, output_folder, size
                )
            ] = filename

        for future in as_completed(futures):
            filename = futures[future]
            try:
                future.result()
            except Exception as e:
                print(f"Failed to process {filename}: {e}")

    # 生成 image_list.json（供前端 script.js 使用，包含图片和视频）
    image_list_path = os.path.join(input_folder, "image_list.json")
    try:
        with open(image_list_path, "w", encoding="utf-8") as f:
            json.dump(media_files, f, ensure_ascii=False, indent=2)
        print(f"image_list.json generated at: {image_list_path}")
    except Exception as e:
        print(f"Failed to write image_list.json: {e}")

    print("All thumbnails generated.")


if __name__ == "__main__":
    generate_thumbnails(size=(360, 360), max_workers=8)