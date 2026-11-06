#include <GLFW/glfw3.h>
#include <GL/gl.h>
#include <math.h>
#include "node.h"
#include "draw.h"
#include <thread>
#include <iostream>

volatile int click_index = 0;

volatile bool running = false;

void drawLine(float x1, float y1, float x2, float y2, float r, float g, float b)
{
    glColor3f(r, g, b); /* colors set outside glBegin/glEnd: see wasm/Pathfinder/README.md */
    glBegin(GL_LINES);
    glVertex2f(x1, y1);
    glVertex2f(x2, y2);
    glEnd();
    glColor3f(1.0f, 1.0f, 1.0f);
}

/* Horizontal or vertical line drawn as a filled quad (WebGL ignores glLineWidth > 1). */
void drawThickLine(float x1, float y1, float x2, float y2, float thickness, float r, float g, float b)
{
    float hx = 0.0f, hy = 0.0f;
    if (y1 == y2)
        hy = thickness * ASPECT_RATIO / 2.0f; // same on-screen thickness as a vertical line
    else
        hx = thickness / 2.0f;
    glColor3f(r, g, b);
    glBegin(GL_QUADS);
    glVertex2f(x1 - hx, y1 - hy);
    glVertex2f(x2 - hx, y2 - hy);
    glVertex2f(x2 + hx, y2 + hy);
    glVertex2f(x1 + hx, y1 + hy);
    glEnd();
    glColor3f(1.0f, 1.0f, 1.0f);
}

void drawSquare(float x, float y, float size, float r, float g, float b, bool fill)
{
    float adjustedHeight = size * ASPECT_RATIO;
    glColor3f(r, g, b);
    if (fill)
    {
        glBegin(GL_QUADS);
    }
    else
    {
        glBegin(GL_LINE_LOOP);
    }
    glVertex2f(x - size / 2.0, y - adjustedHeight / 2.0); // Bottom-left vertex
    glVertex2f(x + size / 2.0, y - adjustedHeight / 2.0); // Bottom-right vertex
    glVertex2f(x + size / 2.0, y + adjustedHeight / 2.0); // Top-right vertex
    glVertex2f(x - size / 2.0, y + adjustedHeight / 2.0); // Top-left vertex
    glEnd();
    glColor3f(1.0f, 1.0f, 1.0f);
}

void drawCircle(float x, float y, float radius, int segments, float r, float g, float b, bool fill)
{
    glColor3f(r, g, b);
    if (fill)
    {
        glBegin(GL_TRIANGLE_FAN);
    }
    else
    {
        glBegin(GL_LINE_LOOP);
    }

    for (int i = 0; i <= segments; i++)
    {
        float angle = 2.0f * M_PI * static_cast<float>(i) / static_cast<float>(segments);
        float dx = radius * cos(angle); // Adjust radius for aspect ratio
        float dy = radius * sin(angle) * ASPECT_RATIO;
        glVertex2f(x + dx, y + dy);
    }

    glEnd();
}

#ifdef __EMSCRIPTEN__
/* Browser build: the browser can't run a blocking while-loop, so each frame
   is driven by emscripten_set_main_loop instead. */
#include <emscripten.h>
static GLFWwindow *g_window;
static void frame()
{
    glClear(GL_COLOR_BUFFER_BIT);
    for (int i = 0; i < HEIGHT; i++)
    {
        for (int j = 0; j < WIDTH; j++)
        {
            Node::nodes[j][i].draw();
        }
    }

    glfwSwapBuffers(g_window);
    glfwPollEvents();
}
#endif

static void on_click(GLFWwindow *window, int button, int action, int mods)
{
    if (button == GLFW_MOUSE_BUTTON_LEFT && action == GLFW_PRESS && !running)
    {
        click_index++;
    }
}

int main()
{
    for (int i = 0; i < HEIGHT; i++)
    {
        for (int j = 0; j < WIDTH; j++)
        {
            Node::nodes[j][i] = Node(j, i);
        }
    }

    GLFWwindow *window;

    if (!glfwInit())
        return -1;

    window = glfwCreateWindow(SCREEN_WIDTH, SCREEN_HEIGHT, "Pathfinding Example", NULL, NULL);
    if (!window)
    {
        glfwTerminate();
        return -1;
    }

    std::thread myThread(events);

    glfwMakeContextCurrent(window);
    glfwSetMouseButtonCallback(window, on_click);
#ifdef __EMSCRIPTEN__
    g_window = window;
    emscripten_set_main_loop(frame, 0, 1);
#else
    while (!glfwWindowShouldClose(window))
    {
        glClear(GL_COLOR_BUFFER_BIT);
        for (int i = 0; i < HEIGHT; i++)
        {
            for (int j = 0; j < WIDTH; j++)
            {
                Node::nodes[j][i].draw();
                Node temp = Node::nodes[j][i];
            }
        }

        glfwSwapBuffers(window);
        glfwPollEvents();
    }
#endif

    glfwTerminate();
    return 0;
}