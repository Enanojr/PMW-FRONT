from rest_framework.pagination import PageNumberPagination


class PaginacionEstandar(PageNumberPagination):
    """Permite al cliente pedir páginas más grandes (catálogos, calendario)."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 200
