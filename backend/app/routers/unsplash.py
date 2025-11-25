from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import httpx

from app.auth import settings


router = APIRouter(prefix="/unsplash", tags=["unsplash"])


UNSPLASH_API_BASE = "https://api.unsplash.com"


def get_access_key() -> str:
  access_key = getattr(settings, "UNSPLASH_ACCESS_KEY", "") or ""
  if not access_key:
    raise HTTPException(
      status_code=500,
      detail="Unsplash access key is not configured on the server.",
    )
  return access_key


@router.get("/search")
async def search_unsplash_photos(
  query: str = Query(..., min_length=1, max_length=100),
  page: int = Query(1, ge=1, le=50),
  per_page: int = Query(15, ge=1, le=30),
  orientation: Optional[str] = Query(
    None, pattern="^(landscape|portrait|squarish)$"
  ),
):
  """
  Unsplash'ta anahtar kelime ile fotoğraf arama endpoint'i.

  Frontend tarafı bu endpoint'i çağırarak grid halinde fotoğrafları gösterebilir
  ve kullanıcı seçtiği fotoğrafın `urls.regular` ya da `urls.full` alanını
  blog içeriğine ekleyebilir.
  """
  access_key = get_access_key()

  params = {
    "query": query,
    "page": page,
    "per_page": per_page,
  }
  if orientation:
    params["orientation"] = orientation

  headers = {"Authorization": f"Client-ID {access_key}"}

  async with httpx.AsyncClient(timeout=10.0) as client:
    resp = await client.get(f"{UNSPLASH_API_BASE}/search/photos", params=params, headers=headers)

  if resp.status_code != 200:
    try:
      data = resp.json()
      detail = data.get("errors") or data.get("error") or resp.text
    except Exception:
      detail = resp.text
    raise HTTPException(status_code=resp.status_code, detail=str(detail))

  data = resp.json()

  # Frontend için sadece gerekli alanları dönecek şekilde sadeleştir
  results = []
  for item in data.get("results", []):
    urls = item.get("urls", {}) or {}
    user = item.get("user", {}) or {}
    results.append(
      {
        "id": item.get("id"),
        "description": item.get("description"),
        "alt_description": item.get("alt_description"),
        "width": item.get("width"),
        "height": item.get("height"),
        "color": item.get("color"),
        "urls": {
          "thumb": urls.get("thumb"),
          "small": urls.get("small"),
          "regular": urls.get("regular"),
          "full": urls.get("full"),
        },
        "user": {
          "name": user.get("name"),
          "username": user.get("username"),
          "profile_image": (user.get("profile_image") or {}).get("small"),
          "links": (user.get("links") or {}).get("html"),
        },
        "links": {
          "html": (item.get("links") or {}).get("html"),
        },
      }
    )

  return {
    "total": data.get("total"),
    "total_pages": data.get("total_pages"),
    "results": results,
  }



