# This dictionary will hold our long-lived, shared resources, like the graph.
shared_resources = {}

def get_app_graph():
    """A simple dependency function to provide the shared graph instance to routers."""
    # We use .get() for a safer access, though in this lifespan context it will always exist.
    return shared_resources.get("graph")