#ifndef _HEADERS_
#define _HEADERS_

#define SPEED 5
#define ARRSIZE 100

void quicksort(int arr[], int arrlen);
void _quicksort(int arr[], int lowbound, int upbound);
int partitionsort(int arr[], int lowbound, int highbound);
void swap(int *a, int *b);
void printArr(int arr[], int arrsize);
void drawArr(int arr[], int arrsize, int color1, int color2);
int msleep(long tms);


void error_callback(int error, const char* description);
void drawPixel(float x, float y);
void drawLine(float x1, float y1, float x2, float y2);
void drawRectangle(float x, float y, float width, float height, float r, float g, float b);
void drawSortingRects(int arr[], int arrSize);
float mapValue(float inputValue, float inputMin, float inputMax, float outputMin, float outputMax);
void *sort();

#endif