#include <GLFW/glfw3.h>
#include <stdio.h>
#include <stdlib.h>
#include "headers.h"
#include <time.h>
#include <pthread.h>

#ifdef __EMSCRIPTEN__
/* Browser build: the browser can't run a blocking while-loop, so each frame
   is driven by emscripten_set_main_loop instead. */
#include <emscripten.h>
static GLFWwindow *g_window;
static int *g_arr;
static void frame(void)
{
    glClear(GL_COLOR_BUFFER_BIT);
    drawSortingRects(g_arr, ARRSIZE);
    glfwSwapBuffers(g_window);
    glfwPollEvents();
}
#endif

struct ThreadArgs
{
    int arr[ARRSIZE];
};

void error_callback(int error, const char *description)
{
    fprintf(stderr, "Error: %s\n", description);
}

void drawPixel(float x, float y)
{
    glBegin(GL_POINTS);
    glVertex2f(x, y);
    glEnd();
}

void drawLine(float x1, float y1, float x2, float y2)
{
    glBegin(GL_LINES);
    glVertex2f(x1, y1);
    glVertex2f(x2, y2);
    glEnd();
}

void drawRectangle(float x, float y, float width, float height, float r, float g, float b)
{
    glColor3f(r, g, b); /* set before glBegin: Emscripten's GL emulation garbles colors set inside glBegin/glEnd */
    glBegin(GL_QUADS);
    glVertex2f(x, y);
    glVertex2f(x + width, y);
    glVertex2f(x + width, y + height);
    glVertex2f(x, y + height);
    glEnd();
}

void drawSortingRects(int arr[], int arrSize)
{
    float rectWidth = 2.0f / arrSize;
    for (int i = 0; i < arrSize; i++)
    {
        float x = mapValue(i, 0, arrSize - 1, -1, 1);
        float height = mapValue(arr[i], 0, arrSize - 1, 0.0f, 1.8f);
        drawRectangle(x, -1.0f, rectWidth, height, 1.0f, 1.0f, 1.0f);
    }
}

float mapValue(float inputValue, float inputMin, float inputMax, float outputMin, float outputMax)
{
    return (inputValue - inputMin) * (outputMax - outputMin) / (inputMax - inputMin) + outputMin;
}

void *threadFunction(void *args)
{
    struct ThreadArgs *threadArgs = (struct ThreadArgs *)args;
    int *arr = threadArgs->arr;
    quicksort(arr, ARRSIZE);

    pthread_exit(NULL);
}

int main()
{
    srand(time(NULL));
    pthread_t thread;
    struct ThreadArgs args;

    for (int i = 0; i < ARRSIZE; i++)
    {
        args.arr[i] = (rand() % ARRSIZE) + 1;
    }

    int rc = pthread_create(&thread, NULL, threadFunction, (void *)&args);

    if (rc)
    {
        printf("ERROR; return code from pthread_create() is %d\n", rc);
        exit(-1);
    }

    GLFWwindow *window;

    if (!glfwInit())
        return -1;

    window = glfwCreateWindow(1280, 720, "Quicksort Example", NULL, NULL);
    if (!window)
    {
        glfwTerminate();
        return -1;
    }

    glfwMakeContextCurrent(window);

#ifdef __EMSCRIPTEN__
    g_window = window;
    g_arr = args.arr;
    emscripten_set_main_loop(frame, 0, 1);
#else
    while (!glfwWindowShouldClose(window))
    {
        glClear(GL_COLOR_BUFFER_BIT);
        drawSortingRects(args.arr, ARRSIZE);

        glfwSwapBuffers(window);
        glfwPollEvents();
    }
#endif

    glfwTerminate();
    return 0;
}
