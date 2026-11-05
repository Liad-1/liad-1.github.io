package binarytree.com.java;

import java.util.Random;

class Main {

    public static void main(String[] args) {
        Terminal.init(); // browser build: console I/O goes to the page (see README)
        Random rand = new Random();
        Binarytree bTree = new Binarytree();
        try {
            for (int i = 0; i < 8; i++) {
                bTree.insert(rand.nextInt(100));
            }
            bTree.treePrint();
        } catch (Exception e) {
            System.out.println(e.getMessage());
        }
        while (true) {
            try {
                System.out.println("What action do you wish to preform? [I-nput/R-emove/P-rint]");
                String inpt = Terminal.readLine();
                switch (inpt) {
                    case "i":
                    case "I":
                        System.out.println("Input a number you wish to add to the tree:");
                        bTree.insert(Integer.valueOf(Terminal.readLine()));
                        bTree.treePrint();
                        break;
                    case "r":
                    case "R":
                        System.out.println("Input a number you wish to remove from the tree:");
                        bTree.remove(Integer.valueOf(Terminal.readLine()));
                        bTree.treePrint();
                        break;
                    case "p":
                    case "P":
                        System.err.println("Input the print order: [Preorder/Inorder/pOstorder]");
                        switch (Terminal.readLine()) {
                            case "p":
                            case "P":
                                bTree.prePrint();
                                break;
                            case "i":
                            case "I":
                                bTree.inPrint();
                                break;
                            case "o":
                            case "O":
                                bTree.postPrint();
                                break;
                        }
                        break;
                    default:
                        System.out.println(inpt + " is not a valid input! Valid inputs are: [I/R/P]");
                }
            } catch (Exception e) {
                System.out.println(e.getMessage());
            }   
        }
    }
}