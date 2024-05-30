from locust import HttpUser, task

class HelloWorldUser(HttpUser):
    @task
    def hello_world(self):
        #self.client.get("/get-all-assets")
        self.client.post("/create-asset")