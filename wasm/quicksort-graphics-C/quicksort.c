#include <stdio.h>
#include <stdlib.h>
#include "headers.h"
#include <time.h>
#include <errno.h>



void quicksort(int arr[], int arrlen) {
    _quicksort(arr, 0, arrlen - 1);
}

void _quicksort(int arr[], int lowbound, int highbound) {
    if (lowbound < highbound) {
        int pindex = partitionsort(arr, lowbound, highbound);
        _quicksort(arr, lowbound, pindex - 1);
        _quicksort(arr, pindex + 1, highbound);
    }
}


int partitionsort(int arr[], int lowbound, int highbound) {
    int *pivot = &arr[highbound];
    int i = lowbound - 1;
    for (int j = lowbound; j < highbound; j++) {
        if (arr[j] <= *pivot) {
            i++;
            swap(&arr[i], &arr[j]);
            msleep(SPEED);
        }
    }
    i++;
    swap(&arr[i], pivot);
    msleep(SPEED);
    return i;
}

void swap(int *a, int *b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}

void printArr(int arr[], int arrsize) {
    for (int i = 0; i < arrsize - 1; i++) {
        printf("%d ", arr[i]);
    }
    printf("%d\n", arr[arrsize - 1]);
}

void drawArr(int arr[], int arrsize, int color1, int color2) {
    msleep(20);
    system("clear");
    for (int j = 50; j > 0; j--) {
        for (int i = 0; i < 100; i++) {
            if (arr[i] >= j) {
                if (i == color1 || i == color2) {
                    printf("\033[1;31m. \033[0m");
                } else {
                    printf("# ");
                }
            } else {
                printf("  ");
            }

        }
        printf("\n");
    }
}

int msleep(long tms)
{
    struct timespec ts;
    int ret;

    if (tms < 0)
    {
        errno = EINVAL;
        return -1;
    }

    ts.tv_sec = tms / 1000;
    ts.tv_nsec = (tms % 1000) * 1000000;

    do {
        ret = nanosleep(&ts, &ts);
    } while (ret && errno == EINTR);

    return ret;
}

// int main() {
//     int n = 50;
//     int array[100];
//     srand(time(NULL));
//     for (int i = 0; i < 100; i++) {
//         array[i] = (rand() % n) + 1;
//     }
//     printf("Array before modification:\n");
//     drawArr(array, n, -1, -1);
    
//     quicksort(array, 100);
    
//     printf("Array after modification:\n");
//     drawArr(array, 100, -1, -1);
//     return 0;
// }